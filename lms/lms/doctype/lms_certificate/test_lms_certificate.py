# Copyright (c) 2021, FOSS United and Contributors
# See license.txt

import unittest
import frappe
from frappe.utils import nowdate


class TestLMSCertificate(unittest.TestCase):
	def setUp(self):
		self.student_email = f"cert.rename.{frappe.generate_hash(length=8)}@example.com"
		user = frappe.get_doc(
			{
				"doctype": "User",
				"email": self.student_email,
				"first_name": "Original",
				"last_name": "Name",
				"enabled": 1,
				"user_type": "Website User",
			}
		)
		user.flags.no_welcome_mail = True
		user.insert(ignore_permissions=True)
		self.student = user

		course = frappe.db.get_value("LMS Course", {}, "name")
		if not course:
			c_doc = frappe.get_doc(
				{
					"doctype": "LMS Course",
					"title": "Test Course",
					"short_introduction": "Test",
					"description": "Test",
					"enable_certification": 1,
				}
			).insert(ignore_permissions=True)
			course = c_doc.name
		self.course = course

		if not frappe.db.exists("LMS Enrollment", {"course": self.course, "member": self.student.name}):
			enr = frappe.get_doc(
				{
					"doctype": "LMS Enrollment",
					"course": self.course,
					"member": self.student.name,
					"progress": 100,
				}
			)
			enr.insert(ignore_permissions=True)
			frappe.db.set_value("LMS Enrollment", enr.name, "progress", 100)

		template = frappe.db.get_value("Print Format", {"doc_type": "LMS Certificate"}, "name") or "Certificate"
		self.certificate = frappe.get_doc(
			{
				"doctype": "LMS Certificate",
				"member": self.student.name,
				"course": self.course,
				"issue_date": nowdate(),
				"template": template,
			}
		).insert(ignore_permissions=True)

	def tearDown(self):
		frappe.db.rollback()

	def test_user_rename_updates_certificate_member_name(self):
		self.assertEqual(
			frappe.db.get_value("LMS Certificate", self.certificate.name, "member_name"),
			"Original Name",
		)

		user_doc = frappe.get_doc("User", self.student.name)
		user_doc.first_name = "Updated"
		user_doc.last_name = "Person"
		user_doc.save(ignore_permissions=True)

		self.assertEqual(
			frappe.db.get_value("LMS Certificate", self.certificate.name, "member_name"),
			"Updated Person",
		)
		reloaded_cert = frappe.get_doc("LMS Certificate", self.certificate.name)
		self.assertEqual(reloaded_cert.member_name, "Updated Person")

	def test_load_from_db_syncs_stale_member_name(self):
		frappe.db.set_value(
			"LMS Certificate",
			self.certificate.name,
			"member_name",
			"Stale Name",
			update_modified=False,
		)
		user_full_name = frappe.db.get_value("User", self.student.name, "full_name")

		cert_doc = frappe.get_doc("LMS Certificate", self.certificate.name)
		self.assertEqual(cert_doc.member_name, user_full_name)
		self.assertEqual(
			frappe.db.get_value("LMS Certificate", self.certificate.name, "member_name"),
			user_full_name,
		)


