<template>
	<div class="flex flex-col h-full">
		<div class="bg-surface-gray-1 px-5 py-5 border-b">
			<div
				v-if="!hideHeader"
				class="text-lg-semibold text-ink-gray-9 leading-snug"
			>
				{{ courseTitle }}
			</div>
			<div
				class="flex items-center gap-2 text-sm text-ink-gray-7"
				:class="{ 'mt-4': !hideHeader }"
			>
				<Cloud class="size-4 stroke-1.5" />
				<span>{{ __('Completed') }} {{ displayedProgress }}%</span>
			</div>
			<div
				class="h-1 w-full rounded-full bg-surface-gray-2 overflow-hidden mt-2"
			>
				<div
					class="h-full bg-surface-green-3 transition-all"
					:style="{ width: `${displayedProgress}%` }"
				/>
			</div>
		</div>

		<ul class="flex-1 overflow-y-auto px-2 py-3 list-none">
			<li v-for="chapter in outline.data || []" :key="chapter.name">
				<Disclosure
					v-slot="{ open }"
					:defaultOpen="chapterDefaultOpen(chapter)"
				>
					<DisclosureButton
						class="w-full flex items-center justify-between rounded px-3 py-2 hover:bg-surface-gray-2 text-start"
					>
						<div
							class="flex items-center gap-2 text-base-medium leading-5 text-ink-gray-9 min-w-0"
						>
							<ChevronDown
								class="size-4 stroke-1.5 shrink-0 transition-transform"
								:class="{ '-rotate-90': !open }"
							/>
							<span class="truncate">{{ chapter.title }}</span>
						</div>
						<span
							v-if="chapter.lessons?.length"
							class="text-sm text-ink-gray-5 shrink-0"
						>
							{{ chapter.lessons.length }}
						</span>
					</DisclosureButton>
					<DisclosurePanel>
						<ul class="list-none">
							<li v-for="lesson in chapter.lessons || []" :key="lesson.name">
								<component
									:is="
										lesson.locked
											? 'div'
											: inlineSelect
											? 'button'
											: 'router-link'
									"
									:type="!lesson.locked && inlineSelect ? 'button' : undefined"
									:to="
										lesson.locked || inlineSelect
											? undefined
											: {
													name: 'Lesson',
													params: {
														courseName,
														chapterNumber: lesson.number.split('-')[0],
														lessonNumber: lesson.number.split('-')[1],
													},
													query: studentViewQuery,
											  }
									"
									class="flex w-full items-center gap-3 rounded ps-9 pe-3 py-2 text-start text-sm leading-5 text-ink-gray-8 hover:bg-surface-gray-2"
									:class="rowClasses(lesson)"
									@click="onLessonClick(lesson)"
								>
									<component
										:is="iconFor(lesson.icon)"
										class="size-4 stroke-1.5 shrink-0 text-ink-gray-7"
									/>
									<span class="truncate flex-1">{{ lesson.title }}</span>
									<template v-if="lesson.locked">
										<LockKeyhole
											class="size-4 stroke-1.5 shrink-0 text-ink-gray-4"
											aria-hidden="true"
										/>
										<span class="sr-only">{{ __('Locked') }}</span>
									</template>
									<CircleCheck
										v-else-if="lesson.is_complete"
										class="size-4 stroke-1.5 shrink-0 text-green-700 fill-none"
									/>
									<Circle
										v-else
										class="size-4 stroke-1.5 shrink-0 text-ink-gray-4"
									/>
								</component>
							</li>
						</ul>
					</DisclosurePanel>
				</Disclosure>
			</li>
		</ul>

		<!-- Below the scrolling list, not in the page header: "finish, tick, advance" is
		     one gesture this way, and this is the only lesson navigation that exists on a
		     mobile viewport (Lesson.vue's header pair is hidden by !isMobile). The !h-11
		     override is the 44px touch target NFR-013 asks for; size="md" alone is 32px. -->
		<div
			v-if="nextLesson"
			class="border-t px-4 py-4"
			:class="{ 'pb-6': !hideHeader }"
		>
			<Button
				variant="solid"
				size="md"
				class="w-full !h-11"
				:disabled="nextLesson.locked"
				@click="goToNextLesson"
			>
				<template #suffix>
					<span class="lucide-chevron-right size-4 rtl:rotate-180" />
				</template>
				{{ __('Next') }}
			</Button>
			<p v-if="nextLesson.locked" class="mt-2 text-sm text-ink-gray-7">
				{{ __('Complete the lessons above to continue.') }}
			</p>
		</div>
	</div>
</template>

<script setup>
import { computed, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Button, createResource } from 'frappe-ui'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import {
	ChevronDown,
	Circle,
	CircleCheck,
	Cloud,
	FileText,
	HelpCircle,
	LockKeyhole,
	MonitorPlay,
	NotebookPen,
	SquareCode,
} from 'lucide-vue-next'
import { isLessonComplete, nextLessonIn, outlineLessons } from '@/composables/useLessonOrder'

const props = defineProps({
	courseName: { type: String, required: true },
	courseTitle: { type: String, default: '' },
	progress: { type: Number, default: 0 },
	selectedLessonNumber: { type: String, default: '' },
	completedLesson: { type: String, default: null },
	inlineSelect: { type: Boolean, default: false },
	withProgress: { type: Boolean, default: true },
	hideHeader: { type: Boolean, default: false },
})

const emit = defineEmits(['select-lesson'])

// Keep ?studentView=1 across lesson hops, or a moderator previewing the course
// silently reverts to their own identity on the first sidebar click.
const route = useRoute()
const router = useRouter()
const studentViewQuery = computed(() =>
	route.query.studentView === '1' ? { studentView: 1 } : undefined
)

const outline = createResource({
	url: 'lms.lms.utils.get_course_outline',
	cache: [
		'course_outline_student',
		props.courseName,
		props.withProgress ? 'progress' : 'no-progress',
	],
	makeParams() {
		return {
			course: props.courseName,
			progress: props.withProgress,
		}
	},
	auto: Boolean(props.courseName),
})

watch(
	() => props.courseName,
	() => {
		if (props.courseName) outline.reload()
	}
)

// Re-runs whenever either source updates so a completion event that
// lands before outline.data finishes loading still gets applied (and a
// late-arriving outline reload doesn't wipe an already-marked lesson).
watchEffect(() => {
	const lessonName = props.completedLesson
	if (!lessonName || !outline.data) return
	for (const chapter of outline.data) {
		const found = chapter.lessons?.find((l) => l.name === lessonName)
		if (found) {
			found.is_complete = true
			return
		}
	}
})

const displayedProgress = computed(() => Math.ceil(props.progress || 0))

// The lesson after the one on screen, in outline order. Null on the last lesson, and
// null when the outline has not loaded or failed: NFR-003, a Next in an indeterminate
// state would either do nothing or navigate somewhere the learner did not expect.
const nextLesson = computed(() => {
	if (outline.error || !outline.data) return null
	return nextLessonIn(outlineLessons(outline.data), props.selectedLessonNumber)
})

function goToNextLesson() {
	const lesson = nextLesson.value
	if (!lesson || lesson.locked) return

	if (props.inlineSelect) {
		// The mobile slide-over selects rather than routes: its parent closes the sheet.
		emit('select-lesson', {
			chapterNumber: lesson.number.split('-')[0],
			lessonNumber: lesson.number.split('-')[1],
		})
		return
	}

	router.push({
		name: 'Lesson',
		params: {
			courseName: props.courseName,
			chapterNumber: lesson.number.split('-')[0],
			lessonNumber: lesson.number.split('-')[1],
		},
		query: studentViewQuery.value,
	})
}

function iconFor(icon) {
	switch (icon) {
		case 'icon-youtube':
			return MonitorPlay
		case 'icon-quiz':
			return HelpCircle
		case 'icon-assignment':
			return NotebookPen
		case 'icon-code':
			return SquareCode
		case 'icon-lock':
			return LockKeyhole
		default:
			return FileText
	}
}

function isActive(number) {
	return props.selectedLessonNumber === number
}

/**
 * Row styling, in the order the classes are meant to win.
 *
 * The completed fill is the legibility signal in a long lesson list, so it is applied
 * last and takes precedence over the active row's grey. A lesson that is both finished
 * and currently open therefore reads as open — `text-ink-gray-9` is the darker ink and
 * stays on top of the tint — while the green still marks it done. Letting the two
 * backgrounds collide is what made "which lesson am I on" ambiguous.
 *
 * A locked row is never filled: its opacity-60 already reads as unavailable, and a green
 * ground behind a locked lesson would say the opposite.
 */
function rowClasses(lesson) {
	return [
		lesson.locked
			? 'cursor-not-allowed opacity-60'
			: props.inlineSelect
			? 'cursor-pointer'
			: '',
		isActive(lesson.number) ? 'bg-surface-gray-2 text-ink-gray-9' : '',
		isLessonComplete(lesson) && !lesson.locked ? 'bg-surface-green-2' : '',
	]
}

function onLessonClick(lesson) {
	if (lesson.locked) return
	emit('select-lesson', {
		chapterNumber: lesson.number.split('-')[0],
		lessonNumber: lesson.number.split('-')[1],
	})
}

function chapterDefaultOpen(chapter) {
	if (!props.selectedLessonNumber) return chapter.idx === 1
	return (
		chapter.lessons?.some((l) => l.number === props.selectedLessonNumber) ||
		false
	)
}
</script>
