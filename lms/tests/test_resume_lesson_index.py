# Copyright (c) 2026, FOSS United and Contributors
# See license.txt

"""Where a course card's "Continue" action points, and the gated reroute behind it.

`get_enrollment_details` attaches `current_lesson_index` to each membership so a listing
card can route to a lesson on its own: `current_lesson` is a Link to Course Lesson, so it
carries a docname and there is no way to build a lesson URL from it client-side. On a gated
course the stored pointer is only a hint, so the index is the gate's answer rather than the
pointer's.

Deliberately self-contained rather than built on lms.lms.test_helpers.BaseTestUtils: this
site runs Frappe 15, whose test base class is `frappe.tests.utils.FrappeTestCase`. The LMS
helpers import `frappe.tests.IntegrationTestCase`, the v16 split of that class, so importing
them raises ImportError here. That mismatch predates this work -- the suite does not import
on this Frappe version either way -- and fixing it across all 46 helper-dependent modules is
its own change. Only the fixtures this test needs are rebuilt below.
"""

import unittest
from unittest.mock import patch

import frappe
from frappe.cache_manager import user_cache_keys
from frappe.tests.utils import FrappeTestCase

from lms.lms.utils import _attach_resume_lesson_index, get_enrollment_details

DOCUMENT_CACHE_PREFIX = "document_cache::"

LESSON_CONTENT = (
	'{"time":1765194986690,"blocks":[{"id":"dkLzbW14ds","type":"markdown",'
	'"data":{"text":"A lesson for the resume index test."}}],"version":"2.29.0"}'
)


class _Fixtures(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		# The field under test reaches this site's schema only via reload_doctype; a
		# bench migrate cannot see the worktree.
		frappe.reload_doctype("LMS Course")

		cls.student = cls._create_user("resume-index@example.com", "Resume", "Student", ["LMS Student"])
		cls.author = cls._create_user(
			"resume-author@example.com", "Resume", "Author", ["Course Creator", "Moderator"]
		)
		cls.course = cls._create_course()
		cls.chapter = cls._create_chapter()
		cls.lessons = [cls._create_lesson(f"Resume Lesson {i}") for i in range(1, 4)]
		cls.enrollment = cls._create_enrollment()

	# Each test runs inside a savepoint, so nothing written by a test needs registering
	# for cleanup. The setUpClass fixtures are deliberately left in place: they are keyed
	# by fixed names and reused across runs.
	def setUp(self):
		super().setUp()
		frappe.db.savepoint("lms_test")
		frappe.set_user(self.student.email)

	def tearDown(self):
		frappe.db.rollback(save_point="lms_test")
		# A savepoint rollback runs no rollback observers, so the document cache, the
		# redis user hashes and frappe.local's perms still hold what the test wrote.
		frappe.cache.delete_keys(DOCUMENT_CACHE_PREFIX)
		frappe.cache.delete_key(user_cache_keys)
		frappe.set_user(self.student.email)
		super().tearDown()

	@classmethod
	def _create_user(cls, email, first_name, last_name, roles):
		if frappe.db.exists("User", email):
			return frappe.get_doc("User", email)
		user = frappe.new_doc("User")
		user.update(
			{
				"email": email,
				"first_name": first_name,
				"last_name": last_name,
				"user_type": "Website User",
				"send_welcome_email": False,
			}
		)
		for role in roles:
			user.append("roles", {"role": role})
		user.save()
		return user

	@classmethod
	def _create_course(cls):
		title = "Resume Index Course"
		existing = frappe.db.exists("LMS Course", {"title": title})
		if existing:
			return frappe.get_doc("LMS Course", existing)

		if not frappe.db.exists("LMS Category", "Business"):
			frappe.get_doc({"doctype": "LMS Category", "category": "Business"}).insert(
				ignore_permissions=True
			)

		course = frappe.new_doc("LMS Course")
		course.update(
			{
				"title": title,
				"short_introduction": "A course for the resume index test.",
				"description": "A course used only by the resume index test.",
				"category": "Business",
				"published": 1,
				"instructors": [{"instructor": cls.author.email}],
			}
		)
		course.save()
		return course

	@classmethod
	def _create_chapter(cls):
		title = "Resume Index Chapter"
		existing = frappe.db.exists("Course Chapter", {"course": cls.course.name, "title": title})
		if existing:
			return frappe.get_doc("Course Chapter", existing)

		chapter = frappe.new_doc("Course Chapter")
		chapter.update({"course": cls.course.name, "title": title})
		chapter.save()
		return chapter

	@classmethod
	def _create_lesson(cls, title):
		existing = frappe.db.exists("Course Lesson", {"course": cls.course.name, "title": title})
		if existing:
			return frappe.get_doc("Course Lesson", existing)

		lesson = frappe.new_doc("Course Lesson")
		lesson.update(
			{
				"course": cls.course.name,
				"chapter": cls.chapter.name,
				"title": title,
				"content": LESSON_CONTENT,
			}
		)
		lesson.save()
		return lesson

	@classmethod
	def _add_lesson_references(cls):
		"""Put the lessons in the chapter at idx 1..3.

		Lesson Reference and Chapter Reference are what get_lesson_index and the lock rule
		read; a Course Lesson row on its own is not in the course's order, so without these
		every lesson resolves to the "1-1" fallback.
		"""
		user = frappe.session.user
		frappe.set_user("Administrator")

		if not frappe.db.exists("Chapter Reference", {"chapter": cls.chapter.name}):
			frappe.get_doc(
				{
					"doctype": "Chapter Reference",
					"chapter": cls.chapter.name,
					"parent": cls.course.name,
					"parenttype": "LMS Course",
					"parentfield": "chapters",
					"idx": 1,
				}
			).insert(ignore_permissions=True)

		for idx, lesson in enumerate(cls.lessons, start=1):
			if not frappe.db.exists("Lesson Reference", {"lesson": lesson.name}):
				frappe.get_doc(
					{
						"doctype": "Lesson Reference",
						"lesson": lesson.name,
						"parent": cls.chapter.name,
						"parenttype": "Course Chapter",
						"parentfield": "lessons",
						"idx": idx,
					}
				).insert(ignore_permissions=True)

		frappe.set_user(user)

	@classmethod
	def _create_enrollment(cls):
		existing = frappe.db.exists(
			"LMS Enrollment", {"course": cls.course.name, "member": cls.student.email}
		)
		if existing:
			return frappe.get_doc("LMS Enrollment", existing)

		enrollment = frappe.new_doc("LMS Enrollment")
		enrollment.update({"member": cls.student.email, "course": cls.course.name})
		enrollment.insert()
		return enrollment

	def _as_admin(self, fn, *args, **kwargs):
		"""Run a write as Administrator, then hand the session back to the student."""
		user = frappe.session.user
		frappe.set_user("Administrator")
		try:
			return fn(*args, **kwargs)
		finally:
			frappe.set_user(user)

	def _set_gated(self, value):
		self._as_admin(
			frappe.db.set_value,
			"LMS Course",
			self.course.name,
			"enforce_lesson_completion",
			value,
		)

	def _set_pointer(self, lesson_name):
		self._as_admin(
			frappe.db.set_value,
			"LMS Enrollment",
			self.enrollment.name,
			"current_lesson",
			lesson_name,
		)

	def _complete(self, lesson_name):
		def write():
			progress = frappe.new_doc("LMS Course Progress")
			progress.update(
				{"member": self.student.email, "course": self.course.name, "lesson": lesson_name}
			)
			progress.insert()
			frappe.db.set_value("LMS Course Progress", progress.name, "status", "Complete")

		self._as_admin(write)

	def _membership(self):
		return get_enrollment_details([frappe._dict({"name": self.course.name})])[0].membership


class TestAttachResumeLessonIndexUnit(FrappeTestCase):
	"""The attachment step with the gate and the index lookup stubbed.

	The integration cases below run the same function against real rows. These exist because
	the inputs worth pinning down are pointer/lock combinations that are awkward to build for
	real -- a pointer at a lesson that has since been locked, a gate that cannot resolve
	anything -- and are cheap to state directly. Nothing here touches the database, but the
	function reads frappe.session, so the runner's site context is still needed.
	"""

	def setUp(self):
		super().setUp()
		# Nothing here touches the database, but the function under test reads
		# frappe.session. The runner's site context does not always create one for a class
		# that builds no documents, so it is created here rather than assumed.
		if frappe.local.session is None:
			frappe.local.session = frappe._dict(user="Administrator", sid="Administrator", data=frappe._dict())
		frappe.set_user("student@example.com")

	def tearDown(self):
		frappe.set_user("Administrator")
		super().tearDown()

	def _membership(self, **kwargs):
		membership = frappe._dict(
			{"name": "ENR-0001", "course": "crm", "current_lesson": None, "progress": 0.0}
		)
		membership.update(kwargs)
		return membership

	def _course(self, membership):
		return frappe._dict({"name": "crm", "membership": membership})

	def _run(self, courses, gate=(set(), None), gated_names=("crm",), user="student@example.com"):
		"""Call the attachment step with the gate and the index lookup stubbed out.

		`gated_names` stands in for the one "is this course gated" query the step makes for
		the whole page, so a case can pin whether an ungated course skips the gate entirely.
		"""
		previous = frappe.local.session.user
		frappe.set_user(user)
		try:
			with (
				patch("frappe.get_all", return_value=list(gated_names)),
				patch("lms.lms.utils.get_lesson_index", side_effect=lambda n: f"IDX-{n}"),
				patch("lms.lms.permissions.get_lesson_gate", return_value=gate),
			):
				_attach_resume_lesson_index(courses)
		finally:
			frappe.set_user(previous)
		return courses

	def test_ungated_pointer_is_translated_to_an_index(self):
		membership = self._membership(current_lesson="LES-A", progress=40)
		self._run([self._course(membership)], gated_names=())
		self.assertEqual(membership.current_lesson_index, "IDX-LES-A")

	def test_no_pointer_leaves_the_index_unset(self):
		# A brand new enrolment: there is nothing to resume, so publishing an index here
		# would be inventing a position. The card decides to open the first lesson instead.
		membership = self._membership(progress=0.0)
		self._run([self._course(membership)], gated_names=())
		self.assertIsNone(membership.get("current_lesson_index"))

	def test_gated_pointer_at_a_locked_lesson_is_replaced_by_the_resume_lesson(self):
		# The dead end this exists to prevent: the pointer names LES-C, the gate says C is
		# locked and the first open lesson is LES-B.
		membership = self._membership(current_lesson="LES-C", progress=20)
		self._run([self._course(membership)], gate=({"LES-C"}, "LES-B"))
		self.assertEqual(membership.current_lesson_index, "IDX-LES-B")

	def test_gated_pointer_at_an_open_lesson_is_kept(self):
		# get_lesson_gate resolves the pointer itself: it hands back the pointer when that
		# lesson is still open. So an open pointer arrives here as the gate's own answer
		# and must survive unchanged, while the lesson after it stays locked.
		membership = self._membership(current_lesson="LES-B", progress=60)
		self._run([self._course(membership)], gate=({"LES-C", "LES-D"}, "LES-B"))
		self.assertEqual(membership.current_lesson_index, "IDX-LES-B")

	def test_a_gate_that_resolves_nothing_falls_back_to_the_pointer(self):
		# get_lesson_gate returns None when it cannot decide. The stored pointer is then
		# better than an absent key the card has no way to route on.
		membership = self._membership(current_lesson="LES-A", progress=10)
		self._run([self._course(membership)], gate=(set(), None))
		self.assertEqual(membership.current_lesson_index, "IDX-LES-A")

	def test_a_guest_resolves_nothing(self):
		membership = self._membership(current_lesson="LES-A")
		self._run([self._course(membership)], user="Guest")
		self.assertIsNone(membership.get("current_lesson_index"))

	def test_no_courses_is_a_no_op(self):
		self.assertEqual(self._run([]), [])

	def test_only_the_gated_courses_reach_the_gate(self):
		# One gated, one not: the ungated course must not be resolved through the gate, and
		# both must come back indexed from the same call.
		gated = self._membership(current_lesson="LES-C")
		ungated = self._membership(current_lesson="LES-C")
		courses = [
			frappe._dict({"name": "gated-course", "membership": gated}),
			frappe._dict({"name": "open-course", "membership": ungated}),
		]
		previous = frappe.local.session.user
		frappe.set_user("student@example.com")
		try:
			with (
				patch("frappe.get_all", return_value=["gated-course"]),
				patch("lms.lms.utils.get_lesson_index", side_effect=lambda n: f"IDX-{n}"),
				patch(
					"lms.lms.permissions.get_lesson_gate", return_value=({"LES-C"}, "LES-A")
				) as gate,
			):
				_attach_resume_lesson_index(courses)
		finally:
			frappe.set_user(previous)

		self.assertEqual(gate.call_count, 1)
		self.assertEqual(gate.call_args.args[0], "gated-course")
		self.assertEqual(gated.current_lesson_index, "IDX-LES-A")
		self.assertEqual(ungated.current_lesson_index, "IDX-LES-C")


class TestResumeLessonIndexIntegration(_Fixtures):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		cls._add_lesson_references()

	def test_index_is_the_pointer_position_ungated(self):
		self._set_gated(0)
		self._set_pointer(self.lessons[1].name)
		membership = self._membership()
		self.assertEqual(membership.current_lesson, self.lessons[1].name)
		self.assertEqual(membership.current_lesson_index, "1-2")

	def test_index_is_absent_before_any_lesson_is_started(self):
		self._set_gated(0)
		self._set_pointer(None)
		self.assertIsNone(self._membership().get("current_lesson_index"))

	def test_gated_pointer_past_the_open_lesson_reroutes_to_the_first_incomplete(self):
		# Nothing finished, so only lesson 1 is open. A pointer at lesson 3 is a dead end and
		# the index has to say 1-1 rather than send the learner into a locked lesson.
		self._set_gated(1)
		self._set_pointer(self.lessons[2].name)
		membership = self._membership()
		self.assertEqual(membership.current_lesson, self.lessons[2].name)
		self.assertEqual(membership.current_lesson_index, "1-1")

	def test_gated_progress_advances_the_index(self):
		self._set_gated(1)
		self._complete(self.lessons[0].name)
		self._set_pointer(self.lessons[2].name)
		self.assertEqual(self._membership().current_lesson_index, "1-2")

	def test_an_open_pointer_is_kept_on_a_gated_course(self):
		self._set_gated(1)
		self._set_pointer(self.lessons[0].name)
		self.assertEqual(self._membership().current_lesson_index, "1-1")

	def test_progress_and_index_travel_together(self):
		# The card decides Start vs Continue vs Completed from one payload, so the two have
		# to be present on the same membership object rather than fetched apart.
		self._set_gated(0)
		self._set_pointer(self.lessons[0].name)
		membership = self._membership()
		self.assertIn("progress", membership)
		self.assertIn("current_lesson_index", membership)

	def test_an_unenrolled_course_gets_no_membership_at_all(self):
		# The card's "not enrolled" state is the absence of this key, so a course the learner
		# is not in must not grow one.
		courses = get_enrollment_details([frappe._dict({"name": "no-such-course-resume-index"})])
		self.assertIsNone(getattr(courses[0], "membership", None))
