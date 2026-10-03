<template>
	<div
		v-if="course.title"
		class="flex flex-col h-full rounded-md overflow-auto text-ink-gray-9 bg-surface-elevation-1"
		style="min-height: 350px"
	>
		<div
			class="w-[100%] h-[168px] bg-cover bg-center bg-no-repeat border-t border-x rounded-t-md"
			:style="
				course.image
					? { backgroundImage: `url('${encodeURI(course.image)}')` }
					: {
							backgroundImage: gradientColor,
							backgroundBlendMode: 'screen',
					  }
			"
		>
			<!-- <div class="flex items-center flex-wrap relative top-4 px-2 w-fit">
				<div
					v-if="course.featured"
					class="flex items-center gap-x-1 text-xs text-ink-amber-6 bg-surface-base border border-outline-amber-1 px-2 py-0.5 rounded-md me-1 mb-1"
				>
					<Star class="size-3 stroke-2" />
					<span>
						{{ __('Featured') }}
					</span>
				</div>
				<div
					v-if="course.tags"
					v-for="tag in course.tags?.split(', ')"
					class="text-xs border bg-surface-base text-ink-gray-9 px-2 py-0.5 rounded-md mb-1 me-1"
				>
					{{ tag }}
				</div>
			</div> -->
			<div
				v-if="!course.image"
				class="flex items-center justify-center text-white flex-1 font-extrabold my-auto px-5 text-center leading-6 h-full"
				:class="
					course.title.length > 32
						? 'text-lg'
						: course.title.length > 20
						? 'text-2xl'
						: 'text-3xl'
				"
			>
				{{ course.title }}
			</div>
		</div>
		<div class="flex flex-col flex-auto p-4 border-x-2 border-b-2 rounded-b-md">
			<div class="flex items-center justify-between mb-2">
				<div v-if="course.lessons">
					<Tooltip :text="__('Lessons')">
						<span class="flex items-center">
							<span class="lucide-book-open size-4 me-1" />
							{{ course.lessons }}
						</span>
					</Tooltip>
				</div>

				<div v-if="course.enrollments">
					<Tooltip :text="__('Enrolled Students')">
						<span class="flex items-center">
							<span class="lucide-users size-4 me-1" />
							{{ formatAmount(course.enrollments) }}
						</span>
					</Tooltip>
				</div>

				<div v-if="course.rating">
					<Tooltip :text="__('Average Rating')">
						<span class="flex items-center">
							<LucideStar
								class="size-4 me-1 text-transparent fill-yellow-500"
							/>
							{{ formatRating(course.rating) }}
						</span>
					</Tooltip>
				</div>

				<Tooltip v-if="course.featured" :text="__('Featured')">
					<span class="lucide-award size-4 text-ink-amber-6" />
				</Tooltip>
			</div>

			<div
				v-if="course.image"
				class="font-semibold leading-6"
				:class="course.title.length > 32 ? 'text-lg' : 'text-2xl'"
			>
				{{ course.title }}
			</div>

			<div class="short-introduction text-sm">
				{{ course.short_introduction }}
			</div>

			<ProgressBar
				v-if="user && course.membership"
				:progress="course.membership.progress"
			/>

		<div
			v-if="user && course.membership"
			class="text-sm mt-2 mb-4"
		>
			{{ Math.ceil(course.membership.progress) }}% {{ __('completed') }}
		</div>

		<!-- The one action this card owns. Opt-in per call site (see `showAction`), so
		     the six surfaces that render a card do not each grow a learner CTA: an
		     instructor on their own course and a program listing both have no business
		     showing "Start Course". Sits above the instructor/price row so it reads as
		     the card's primary control rather than as another metadata chip.

		     `.prevent` is load-bearing, not defensive. The card is wrapped in a
		     router-link on the surfaces that opt in, and `@click.stop` alone does NOT
		     stop that navigation: the browser follows the anchor's href as the default
		     action of any click inside it, so the learner lands on the course page
		     instead of the lesson and the action looks broken. `.stop` keeps the
		     card link's own handler out of the way, `.prevent` cancels the href. -->
		<div v-if="actionState !== 'none'" class="mb-4">
			<Badge
				v-if="actionState === 'completed'"
				theme="green"
				size="lg"
				class="w-full justify-center"
			>
				<template #prefix>
					<span class="lucide-circle-check size-4" />
				</template>
				{{ __('Completed') }}
			</Badge>
			<Button
				v-else
				variant="solid"
				size="md"
				class="w-full !h-11"
				:loading="starting"
				@click.stop.prevent="onAction"
			>
				<template #prefix>
					<span
						:class="
							actionState === 'continue'
								? 'lucide-book-text size-4'
								: 'lucide-play size-4'
						"
					/>
				</template>
				{{
					actionState === 'continue' ? __('Continue Course') : __('Start Course')
				}}
			</Button>
		</div>


			<div class="flex items-center justify-between mt-auto">
				<div class="flex avatar-group overlap">
					<div
						class="h-6 me-1"
						:class="{ 'avatar-group overlap': course.instructors.length > 1 }"
					>
						<UserAvatar
							v-for="instructor in course.instructors"
							:key="instructor.username || instructor.name"
							:user="instructor"
						/>
					</div>
					<CourseInstructors :instructors="course.instructors" />
				</div>

				<div class="flex items-center gap-x-2">
					<div v-if="course.paid_course" class="font-semibold">
						{{ course.price }}
					</div>

					<Tooltip
						v-if="course.paid_certificate || course.enable_certification"
						:text="__('Get Certified')"
					>
						<span class="lucide-graduation-cap size-5 text-ink-gray-7" />
					</Tooltip>
				</div>
			</div>
		</div>
	</div>
</template>
<script setup>
import { sessionStore } from '@/stores/session'
import { Badge, Button, Tooltip, call, toast } from 'frappe-ui'
import { formatAmount, formatRating } from '@/utils'
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import CourseInstructors from '@/components/CourseInstructors.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import { canAutoEnroll, resolveCardAction } from '@/composables/useCardAction'

// storeToRefs keeps `user` a ref, so the card re-renders when the session resolves.
// The session is read from a cookie at setup and can arrive after the first paint, and a
// destructured value would freeze on whatever it was then -- leaving the action missing
// for a signed-in learner until the page was reloaded.
const { user } = storeToRefs(sessionStore())
const router = useRouter()

const props = defineProps({
	course: {
		type: Object,
		default: null,
	},
	// Off by default, so a new call site has to opt in deliberately rather than
	// inherit a learner CTA on a surface that should not have one.
	showAction: {
		type: Boolean,
		default: false,
	},
})

const starting = ref(false)

const gradientColor = computed(() => {
	let color = props.course.card_gradient?.toLowerCase() || 'blue'
	return `linear-gradient(to top right, black, var(--${color}-400))`
})

// A guest cannot enrol, so a card with no signed-in user has no action to show
// even on a surface that asked for one. The membership object is the only
// evidence of enrolment on this payload, so its absence is "not enrolled".
const membership = computed(() => props.course?.membership ?? null)

// `user` is a ref (see storeToRefs above), so it is read with .value and stays reactive.
const actionState = computed(() => {
	if (!props.showAction || !user.value) return 'none'
	return resolveCardAction({
		progress: membership.value?.progress,
		paidCourse: Boolean(props.course?.paid_course),
		disableSelfLearning: Boolean(props.course?.disable_self_learning),
	})
})

// Enrol, then open the first lesson. A paid or self-learning-disabled course cannot
// be auto-enrolled into, so it routes elsewhere instead: billing for the one, and a
// notice for the other, which is what the course page says for the same course.
async function onAction() {
	if (starting.value) return
	const courseName = props.course?.name
	if (!courseName) return

	if (membership.value) {
		router.push(lessonRoute(membership.value.current_lesson_index))
		return
	}

	if (props.course.paid_course) {
		router.push({ name: 'Billing', params: { type: 'course', name: courseName } })
		return
	}

	if (
		!canAutoEnroll({
			paidCourse: Boolean(props.course.paid_course),
			disableSelfLearning: Boolean(props.course.disable_self_learning),
		})
	) {
		// Not an error: the course is deliberately closed to self-enrolment, and the
		// learner needs to reach whoever administers it rather than be left guessing.
		toast.warning(
			__(
				'You cannot enroll in this course as self-learning is disabled. Please contact the Administrator.'
			)
		)
		return
	}

	starting.value = true
	try {
		// The generic insert rather than a bespoke endpoint: it goes through the
		// controller, so validate_course_enrollment_eligibility still runs and a course
		// closed to this learner is refused by the same rule that governs the form.
		await call('frappe.client.insert', {
			doc: { doctype: 'LMS Enrollment', course: courseName, member: user.value },
		})
		// The listing was fetched before this enrolment existed, so the card still reads
		// as unenrolled; drop the cached page or the card would offer to start again.
		clearListCache()
		toast.success(__('You have been enrolled in this course'))
		router.push(lessonRoute('1-1'))
	} catch (err) {
		// No navigation on failure: landing on a lesson for an enrolment that does not
		// exist would strand the learner on a page they cannot read past.
		const message = typeof err === 'string' ? err : (err?.messages?.[0] ?? 'Error')
		toast.warning(__(message))
	} finally {
		starting.value = false
	}
}

function lessonRoute(index) {
	const [chapterNumber, lessonNumber] = String(index || '1-1').split('-')
	return {
		name: 'Lesson',
		params: { courseName: props.course.name, chapterNumber, lessonNumber },
	}
}

function clearListCache() {
	// A no-op is fine here: the fallback is a reload on the next visit, and the
	// alternative (keying the cache off enrolment) needs a server change this
	// feature deliberately does not make.
	try {
		window.dispatchEvent(new CustomEvent('lms:courses-changed'))
	} catch {
		/* no listener; the stale card resolves itself on the next page load */
	}
}
</script>
<style>
.course-card-pills {
	background: #ffffff;
	margin-left: 0;
	margin-right: 0.5rem;
	padding: 3.5px 8px;
	font-size: 11px;
	text-align: center;
	letter-spacing: 0.011em;
	text-transform: uppercase;
	font-weight: 600;
	width: fit-content;
}

.avatar-group {
	display: inline-flex;
	align-items: center;
}

.avatar-group .avatar {
	transition: margin 0.1s ease-in-out;
}

.avatar-group.overlap .avatar + .avatar {
	margin-inline-start: calc(-8px);
}

.short-introduction {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	text-overflow: ellipsis;
	width: 100%;
	overflow: hidden;
	margin: 0.25rem 0 1.25rem;
	line-height: 1.5;
}
</style>
