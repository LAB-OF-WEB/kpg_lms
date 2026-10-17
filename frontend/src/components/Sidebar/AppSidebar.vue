<template>
	<div
		class="kpg-lms-sidebar flex h-full flex-col justify-between transition-all duration-300 ease-in-out overflow-x-hidden"
		:class="isCollapsed ? 'w-14 kpg-lms-collapsed' : 'w-[210px]'"
		:id="sidebarId"
	>
		<!-- Common Top Logo -->
		<a
			class="kpg-lms-logo"
			:href="safeUrl(deskUrl || '/app')"
			:aria-label="__('Back to Desk')"
		>
			<img
				:src="safeUrl(brandLogo)"
				alt="KPG"
				onerror="this.outerHTML='<div class=\'kpg-lms-logo-fallback\'>KPG</div>';"
			/>
		</a>

		<!-- View 1: KPG Shell Rail (default) -->
		<template v-if="sidebarMode === 'kpg'">
			<ul class="kpg-nav flex-1 overflow-y-auto min-h-0 py-2">
				<li
					v-for="item in navItems"
					:key="item.label"
					class="kpg-nav-item"
					:class="{
						active: item.label === 'LMS',
						'justify-center !px-0 !mx-1': isCollapsed,
					}"
					role="link"
					tabindex="0"
					:aria-label="item.label"
					:title="isCollapsed ? item.label : undefined"
					:data-href="safeUrl(item.href)"
					:data-match="item.match.join(',')"
					@click.prevent="handleNavClick(item)"
					@keydown.enter="handleNavClick(item)"
				>
					<span class="kpg-nav-icon" aria-hidden="true">
						<component :is="item.icon" class="h-4 w-4" />
					</span>
					<span v-if="!isCollapsed" class="kpg-nav-label">{{ item.label }}</span>
				</li>
			</ul>

			<!-- Admin toggle to switch to original LMS sidebar -->
			<button
				v-if="isAdminOrSysMgr && !isCollapsed"
				type="button"
				class="kpg-lms-toggle-view"
				:aria-label="__('Original LMS Sidebar')"
				:title="__('View Original LMS Sidebar')"
				@click="toggleSidebarMode"
			>
				<component :is="LayoutPanelLeft" class="h-4 w-4 shrink-0" aria-hidden="true" />
				<span>{{ __('Original LMS Sidebar') }}</span>
			</button>
			<button
				v-else-if="isAdminOrSysMgr && isCollapsed"
				type="button"
				class="kpg-lms-toggle-view !px-0 !mx-1 justify-center"
				:aria-label="__('Original LMS Sidebar')"
				:title="__('View Original LMS Sidebar')"
				@click="toggleSidebarMode"
			>
				<component :is="LayoutPanelLeft" class="h-4 w-4 shrink-0" aria-hidden="true" />
			</button>

			<div v-if="!isCollapsed" class="kpg-lms-footer !mt-auto" aria-hidden="true">
				<div>Build Better Roofs</div>
				<div>Build Brighter Futures</div>
			</div>
		</template>

		<!-- View 2: Original Frappe LMS Sidebar (available for Administrator / System Manager) -->
		<template v-else>
			<div
				class="flex flex-col overflow-y-auto flex-1 min-h-0"
				:class="sidebarStore.isSidebarCollapsed ? 'items-center' : ''"
			>
				<!-- Button for Admin to switch back to KPG Rail -->
				<button
					v-if="isAdminOrSysMgr && !sidebarStore.isSidebarCollapsed"
					type="button"
					class="kpg-lms-toggle-view !my-2"
					:aria-label="__('Switch to KPG Sidebar')"
					@click="toggleSidebarMode"
				>
					<component :is="LayoutGrid" class="h-4 w-4 shrink-0" aria-hidden="true" />
					<span>{{ __('Switch to KPG Sidebar') }}</span>
				</button>
				<button
					v-else-if="isAdminOrSysMgr"
					type="button"
					class="kpg-lms-toggle-view !my-2 !px-0 justify-center"
					:aria-label="__('Switch to KPG Sidebar')"
					:title="__('Switch to KPG Sidebar')"
					@click="toggleSidebarMode"
				>
					<component :is="LayoutGrid" class="h-4 w-4 shrink-0" aria-hidden="true" />
				</button>

			<div class="kpg-lms-user">
				<UserDropdown :isCollapsed="sidebarStore.isSidebarCollapsed" />
			</div>
			<div class="flex flex-col" v-if="sidebarSettings.data">
				<div v-for="link in sidebarLinks" class="mx-2 my-2.5">
					<div
						v-if="!link.hideLabel"
						class="mb-2 mt-3 flex cursor-pointer gap-1.5 px-1 text-p-base-medium text-ink-gray-5 transition-all duration-300 ease-in-out"
					>
						<span>{{ __(link.label) }}</span>
					</div>
					<nav class="space-y-1">
						<div v-for="item in link.items">
							<SidebarLink
								:link="item"
								:isCollapsed="sidebarStore.isSidebarCollapsed"
							/>
						</div>
					</nav>
				</div>
			</div>
			<div
				v-if="sidebarSettings.data?.web_pages?.length || isModerator"
				class="mt-4"
			>
				<div
					class="flex items-center justify-between pe-2 cursor-pointer"
					:class="sidebarStore.isSidebarCollapsed ? 'ps-3' : 'ps-4'"
					@click="toggleWebPages"
				>
					<div
						v-if="!sidebarStore.isSidebarCollapsed"
						class="flex items-center text-ink-gray-5 my-1"
					>
						<span class="grid h-5 w-6 flex-shrink-0 place-items-center">
							<span
								class="lucide-chevron-right h-4 w-4 text-ink-gray-9 transition-all duration-300 ease-in-out"
								:class="{
									'rotate-90': !sidebarStore.isWebpagesCollapsed,
									'rtl:rotate-180': sidebarStore.isWebpagesCollapsed,
								}"
							/>
						</span>
						<span class="ms-2">
							{{ __('More') }}
						</span>
					</div>
					<Button
						v-if="isModerator && !readOnlyMode"
						variant="ghost"
						@click="openPageModal()"
					>
						<template #icon>
							<span class="lucide-plus h-4 w-4 text-ink-gray-7" />
						</template>
					</Button>
				</div>
				<div
					v-if="sidebarSettings.data?.web_pages?.length"
					class="flex flex-col transition-all duration-300 ease-in-out"
					:class="!sidebarStore.isWebpagesCollapsed ? 'block' : 'hidden'"
				>
					<div
						v-for="link in sidebarSettings.data.web_pages"
						class="mx-2 my-0.5"
					>
						<SidebarLink
							:link="link"
							:isCollapsed="sidebarStore.isSidebarCollapsed"
							:showControls="isModerator ? true : false"
							@openModal="openPageModal"
							@deletePage="deletePage"
						/>
					</div>
				</div>
			</div>
		</div>
		<div class="m-2 flex flex-col gap-1">
			<div
				v-if="readOnlyMode && !sidebarStore.isSidebarCollapsed"
				class="z-10 m-2 bg-surface-elevation-2 py-2.5 px-3 text-p-xs text-ink-gray-7 rounded-md"
			>
				{{
					__(
						'This site is being updated. You will not be able to make any changes. Full access will be restored shortly.'
					)
				}}
			</div>
			<div
				v-if="
					isStudent && !profileIsComplete && !sidebarStore.isSidebarCollapsed
				"
				class="flex flex-col gap-3 text-ink-gray-9 py-2.5 px-3 bg-surface-base shadow-sm rounded-md"
			>
				<div class="flex flex-col text-p-sm gap-1">
					<div class="inline-flex gap-1">
						<span class="lucide-user h-4 my-0.5 shrink-0" />
						<div class="font-medium">
							{{ __('Complete your profile') }}
						</div>
					</div>
					<div class="text-ink-gray-7">
						{{ __('Highlight what makes you unique and show your skills.') }}
					</div>
				</div>
				<router-link
					:to="{
						name: 'Profile',
						params: {
							username: userResource.data?.username,
						},
					}"
				>
					<Button :label="__('My Profile')" class="w-full">
						<template #prefix>
							<span class="lucide-chevrons-right h-4 w-4 text-ink-gray-7" />
						</template>
					</Button>
				</router-link>
			</div>
			<Tooltip
				v-if="
					isStudent && !profileIsComplete && sidebarStore.isSidebarCollapsed
				"
				:text="__('Complete your profile')"
			>
				<router-link
					:to="{
						name: 'Profile',
						params: {
							username: userResource.data?.username,
						},
					}"
					class="flex items-center justify-center"
				>
					<span class="lucide-user size-4 text-ink-gray-7 cursor-pointer" />
				</router-link>
			</Tooltip>
			<TrialBanner
				v-if="
					userResource.data?.is_system_manager && userResource.data?.is_fc_site
				"
				:isSidebarCollapsed="sidebarStore.isSidebarCollapsed"
			/>
			<GettingStartedBanner
				v-if="showOnboarding && !isOnboardingStepsCompleted"
				:isSidebarCollapsed="sidebarStore.isSidebarCollapsed"
				appName="learning"
			/>
			<div
				v-if="!sidebarStore.isSidebarCollapsed"
				class="kpg-lms-footer"
				aria-hidden="true"
			>
				<div>Build Better Roofs</div>
				<div>Build Brighter Futures</div>
			</div>

			<div
				class="kpg-lms-tools flex items-center mt-4"
				:class="
					sidebarStore.isSidebarCollapsed ? 'flex-col space-y-3' : 'flex-row'
				"
			>
				<div
					class="flex items-center flex-1 gap-3"
					:class="sidebarStore.isSidebarCollapsed ? 'flex-col' : 'flex-row'"
				>
					<Tooltip v-if="readOnlyMode && sidebarStore.isSidebarCollapsed">
						<span
							class="lucide-circle-alert size-4 text-ink-gray-7 cursor-pointer"
						/>
						<template #body>
							<div
								class="max-w-[30ch] rounded bg-surface-gray-10 px-2 py-1 text-center text-p-xs text-ink-base shadow-xl"
							>
								{{
									__(
										'This site is being updated. You will not be able to make any changes. Full access will be restored shortly.'
									)
								}}
							</div>
						</template>
					</Tooltip>
					<Tooltip v-if="showOnboarding" :text="__('Help')">
						<span
							class="lucide-circle-help size-4 text-ink-gray-7 cursor-pointer"
							@click="
								() => {
									showHelpModal = minimize ? true : !showHelpModal
									minimize = !showHelpModal
								}
							"
						/>
					</Tooltip>
					<Tooltip :text="__('Powered by Frappe Learning')">
						<span
							class="lucide-zap size-4 text-ink-gray-7 cursor-pointer"
							@click="redirectToWebsite()"
						/>
					</Tooltip>
				</div>
				<Tooltip
					:text="
						sidebarStore.isSidebarCollapsed ? __('Expand') : __('Collapse')
					"
				>
					<CollapseSidebar
						class="size-4 text-ink-gray-7 duration-300 stroke-1.5 ease-in-out cursor-pointer"
						:style="{
							transform:
								isRtl !== sidebarStore.isSidebarCollapsed
									? 'rotateY(180deg)'
									: '',
						}"
						@click="toggleSidebar()"
					/>
				</Tooltip>
			</div>
		</div>
		<HelpModal
			data-testid="onboarding-help-modal"
			v-if="showOnboarding && showHelpModal"
			v-model="showHelpModal"
			v-model:articles="articles"
			appName="learning"
			title="Frappe Learning"
			:logo="LMSLogo"
			:afterSkip="(step) => capture('onboarding_step_skipped_' + step)"
			:afterSkipAll="() => capture('onboarding_steps_skipped')"
			:afterReset="(step) => capture('onboarding_step_reset_' + step)"
			:afterResetAll="() => capture('onboarding_steps_reset')"
			docsLink="https://docs.frappe.io/learning"
		/>
		<IntermediateStepModal
			v-model="showIntermediateModal"
			:currentStep="currentStep"
		/>
		</template>
	</div>
	<CommandPalette v-model="settingsStore.isCommandPaletteOpen" />
	<PageModal
		v-model="showPageModal"
		v-model:reloadSidebar="sidebarSettings"
		:page="pageToEdit"
	/>
</template>

<script setup>
import {
	ref,
	onMounted,
	inject,
	watch,
	reactive,
	markRaw,
	h,
	onUnmounted,
	computed,
} from 'vue'
import { useRouter } from 'vue-router'
import { Button, call, Tooltip, toast } from 'frappe-ui'
import {
	TrialBanner,
	HelpModal,
	GettingStartedBanner,
	useOnboarding,
	showHelpModal,
	minimize,
	IntermediateStepModal,
	useTelemetry,
} from 'frappe-ui/frappe'
import {
	BookOpen,
	CircleHelp,
	FolderTree,
	FileText,
	UserPlus,
	Users,
	BookText,
	LayoutDashboard,
	User,
	Briefcase,
	Wrench,
	CheckSquare,
	Database,
	Building2,
	MessageSquare,
	LayoutPanelLeft,
	LayoutGrid,
} from 'lucide-vue-next'

import PageModal from '@/components/Modals/PageModal.vue'
import LMSLogo from '@/components/Icons/LMSLogo.vue'
import InviteIcon from '@/components/Icons/InviteIcon.vue'
import UserDropdown from '@/components/Sidebar/UserDropdown.vue'
import CollapseSidebar from '@/components/Icons/CollapseSidebar.vue'
import SidebarLink from '@/components/Sidebar/SidebarLink.vue'
import CommandPalette from '@/components/CommandPalette/CommandPalette.vue'

import { getSidebarLinks } from '@/utils'
import { openExternal } from '@/utils/openExternal'
import { safeUrl } from '@/utils/safeUrl'
import { openFormRoute } from '@/composables/useFormRoute'
import { usersStore } from '@/stores/user'
import { useSidebar } from '@/stores/sidebar'
import { useSettings } from '@/stores/settings'
import { sessionStore } from '@/stores/session'
import {
	loadUnreadCount,
	unreadCount,
	unreadNotifications,
} from '@/stores/notifications'

const { userResource } = usersStore()
const sidebarStore = useSidebar()
const { branding } = sessionStore()
const settingsStore = useSettings()
const {
	sidebarSettings,
	activeTab,
	isSettingsOpen,
	programs,
	loadSidebarSettings,
} = useSettings()

const isCollapsed = computed(() => sidebarStore.isSidebarCollapsed)
const socket = inject('$socket')
const sidebarLinks = ref(null)
const { capture } = useTelemetry()
const showPageModal = ref(false)
const isModerator = ref(false)
const isInstructor = ref(false)
const pageToEdit = ref(null)
const showOnboarding = ref(false)
const showIntermediateModal = ref(false)
const currentStep = ref({})
const router = useRouter()
let onboardingDetails
let isOnboardingStepsCompleted = false
const readOnlyMode = window.read_only_mode
const isRtl = document.documentElement.dir === 'rtl'
const iconProps = {
	strokeWidth: 1.5,
	width: 16,
	height: 16,
}

const kpgLogo = '/assets/kpg_crm/images/kpg.jpeg'
const brandLogo = computed(() => {
	try {
		return (
			branding?.data?.banner_image?.file_url ||
			branding?.data?.app_logo ||
			kpgLogo
		)
	} catch {
		return kpgLogo
	}
})

const sidebarId = 'kpg-lms-sidebar'

const userRoles = computed(() => {
	return userResource.data?.roles || []
})

// Whether current user is Administrator or System Manager
const isAdminOrSysMgr = computed(() => {
	const roles = userRoles.value
	const userObj = userResource?.data
	let cookieUser = null
	try {
		const cookies = new URLSearchParams(document.cookie.split('; ').join('&'))
		cookieUser = cookies.get('user_id')
	} catch {}

	return Boolean(
		roles.includes('System Manager') ||
		roles.includes('Administrator') ||
		userObj?.is_system_manager ||
		userObj?.is_admin ||
		(userObj?.name === 'Administrator') ||
		(cookieUser === 'Administrator') ||
		(window.frappe?.session?.user === 'Administrator')
	)
})

// Sidebar mode: 'kpg' (default) or 'original'
const storedMode = typeof localStorage !== 'undefined' ? localStorage.getItem('lms_sidebar_view_mode') : null
const sidebarMode = ref(isAdminOrSysMgr.value && storedMode === 'original' ? 'original' : 'kpg')

watch(isAdminOrSysMgr, (isAdmin) => {
	if (!isAdmin && sidebarMode.value !== 'kpg') {
		sidebarMode.value = 'kpg'
	}
})

function toggleSidebarMode() {
	sidebarMode.value = sidebarMode.value === 'kpg' ? 'original' : 'kpg'
	try {
		localStorage.setItem('lms_sidebar_view_mode', sidebarMode.value)
	} catch {}
}

// Navigation items matching kpg_shell.js nav_items()
const navItems = computed(() => {
	const roles = userRoles.value
	const isSys = isAdminOrSysMgr.value
	const isAgro = roles.some((r) => /agro|agriculture/i.test(r))
	const isSalesOrCrm = roles.some((r) => /sales|cre|crm/i.test(r))
	const isAgroOnlyUser = !isSys && isAgro && !isSalesOrCrm
	const items = []

	if (isAgroOnlyUser) {
		items.push({
			label: 'Agromart',
			icon: markRaw(Wrench),
			href: '/app/agro-dashboard',
			match: ['agro-dashboard'],
		})
		items.push({
			label: 'Enquiries',
			icon: markRaw(CheckSquare),
			href: '/app/kpg-enquiry',
			match: ['kpg-enquiry', 'kpg enquiry'],
		})
		items.push({
			label: 'LMS',
			icon: markRaw(BookOpen),
			href: '/lms',
			match: ['lms'],
		})
		return items
	}

	// 1. Dashboard
	if (
		isSys ||
		userResource.data?.desk_url === '/app/kpg-dashboard' ||
		roles.some((r) =>
			[
				'FDM',
				'Purchase Admin',
				'HR',
				'Product Collateral Manager',
				'Branch Manager',
				'Customer Relationship Executive',
				'CRE Sales',
			].includes(r)
		)
	) {
		items.push({
			label: 'Dashboard',
			icon: markRaw(LayoutDashboard),
			href: '/app/kpg-dashboard',
			match: ['kpg-dashboard'],
		})
	}

	// 2. Leads
	if (
		isSys ||
		roles.some((r) =>
			[
				'Desk User',
				'Sales User',
				'Sales Manager',
				'Sales Person',
				'sales head',
				'Branch Manager',
				'Business Development Manager',
				'Customer Relationship Executive',
				'CRE Sales',
				'dm agent',
				'Operations Manager',
				'Lead Capture API',
			].includes(r)
		)
	) {
		items.push({
			label: 'Leads',
			icon: markRaw(User),
			href: '/app/lead',
			match: ['lead'],
		})
	}

	// 3. Deals
	if (
		isSys ||
		roles.some((r) =>
			[
				'Branch Manager',
				'Business Development Manager',
				'Customer Relationship Executive',
				'CRE Sales',
				'Sales Person',
				'Projects Manager',
			].includes(r)
		)
	) {
		items.push({
			label: 'Deals',
			icon: markRaw(Briefcase),
			href: '/app/deal',
			match: ['deal'],
		})
	}

	// 4. Agromart
	if (
		isSys ||
		userResource.data?.desk_url === '/app/agro-dashboard' ||
		roles.some((r) => /agro|agriculture/i.test(r))
	) {
		items.push({
			label: 'Agromart',
			icon: markRaw(Wrench),
			href: '/app/agro-dashboard',
			match: ['agro-dashboard'],
		})
	}

	// 5. Enquiries
	if (
		isSys ||
		roles.some((r) =>
			['Agro User', 'Agro user', 'Agriculture Manager', 'Agriculture User'].includes(r)
		)
	) {
		items.push({
			label: 'Enquiries',
			icon: markRaw(CheckSquare),
			href: '/app/kpg-enquiry',
			match: ['kpg-enquiry', 'kpg enquiry'],
		})
	}

	// 6. Accounting
	if (isSys || roles.includes('Accounts Manager') || roles.includes('Accounts User')) {
		items.push({
			label: 'Accounting',
			icon: markRaw(Database),
			href: '/app/accounting',
			match: ['accounting'],
		})
	}

	// 7. HR
	if (isSys || roles.includes('HR Manager') || roles.includes('HR User')) {
		items.push({
			label: 'HR',
			icon: markRaw(Building2),
			href: '/app/hr',
			match: ['hr'],
		})
	}

	// 8. LMS item included per user requirement
	items.push({
		label: 'LMS',
		icon: markRaw(BookOpen),
		href: '/lms',
		match: ['lms'],
	})

	// 9. Support
	if (
		isSys ||
		roles.includes('Support Team') ||
		roles.includes('Support User') ||
		roles.includes('Customer')
	) {
		items.push({
			label: 'Support',
			icon: markRaw(MessageSquare),
			href: '/app/support',
			match: ['support'],
		})
	}

	return items
})

function handleNavClick(item) {
	if (item.href === '/lms') {
		// Already in LMS, navigate to home/root of LMS
		if (router.currentRoute.value.name !== 'Home') {
			router.push({ name: 'Home' })
		}
		return
	}
	if (item.href.startsWith('http')) {
		openExternal(item.href)
		return
	}
	window.location.href = item.href
}

const deskUrl = computed(() => {
	return userResource.data?.desk_url || null
})

onMounted(() => {
	setUpOnboarding()
	addKeyboardShortcut()
	updateSidebarLinks()
	loadUnreadCount()
	if (socket) {
		socket.on('publish_lms_notifications', () => {
			unreadNotifications.reload()
		})
	}
})

watch(unreadCount, () => updateUnreadCount())

const updateSidebarLinksVisibility = () => {
	loadSidebarSettings().then(() => {
		const data = sidebarSettings.data
		if (!data) return
		Object.keys(data).forEach((key) => {
			if (!parseInt(data[key])) {
				sidebarLinks.value?.forEach((link) => {
					link.items = link.items.filter(
						(item) => item.label.toLowerCase().split(' ').join('_') !== key
					)
				})
			}
		})
	})
}

const onKeyboardShortcut = (e) => {
	if (
		e.key === 'k' &&
		(e.ctrlKey || e.metaKey) &&
		!e.repeat &&
		!e.target.classList.contains('ProseMirror')
	) {
		toggleCommandPalette()
		e.preventDefault()
	}
}

const addKeyboardShortcut = () => {
	window.addEventListener('keydown', onKeyboardShortcut)
}

const toggleCommandPalette = () => {
	settingsStore.isCommandPaletteOpen = !settingsStore.isCommandPaletteOpen
}

const updateUnreadCount = () => {
	sidebarLinks.value?.forEach((link) => {
		link.items.forEach((item) => {
			if (item.label === 'Notifications') {
				item.count = unreadCount.value || 0
			}
		})
	})
}

const openPageModal = (link) => {
	showPageModal.value = true
	pageToEdit.value = link
}

const deletePage = (link) => {
	call('lms.lms.api.delete_documents', {
		doctype: 'LMS Sidebar Item',
		documents: [link.name],
	}).then(() => {
		loadSidebarSettings(true)
		toast.success(__('Page deleted successfully'))
	})
}

const toggleSidebar = () => {
	sidebarStore.isSidebarCollapsed = !sidebarStore.isSidebarCollapsed
	localStorage.setItem(
		'isSidebarCollapsed',
		JSON.stringify(sidebarStore.isSidebarCollapsed)
	)
}

const toggleWebPages = () => {
	sidebarStore.isWebpagesCollapsed = !sidebarStore.isWebpagesCollapsed
	localStorage.setItem(
		'isWebpagesCollapsed',
		JSON.stringify(sidebarStore.isWebpagesCollapsed)
	)
}

const getFirstCourse = async () => {
	let firstCourse = localStorage.getItem('firstCourse')
	if (firstCourse) return firstCourse
	return await call('lms.lms.onboarding.get_first_course')
}

const getFirstBatch = async () => {
	let firstBatch = localStorage.getItem('firstBatch')
	if (firstBatch) return firstBatch
	return await call('lms.lms.onboarding.get_first_batch')
}

const steps = reactive([
	{
		name: 'create_first_course',
		title: __('Create your first course'),
		icon: markRaw(h(BookOpen, iconProps)),
		completed: false,
		onClick: () => {
			minimize.value = true
			router.push({
				name: 'Courses',
			})
		},
	},
	{
		name: 'create_first_chapter',
		title: __('Add your first chapter'),
		icon: markRaw(h(FolderTree, iconProps)),
		completed: false,
		dependsOn: 'create_first_course',
		onClick: async () => {
			minimize.value = true
			let course = await getFirstCourse()
			if (course) {
				router.push({
					name: 'CourseDetail',
					params: { courseName: course },
					hash: '#settings',
				})
			} else {
				openFormRoute(router, { name: 'NewCourse' })
			}
		},
	},
	{
		name: 'create_first_lesson',
		title: __('Add your first lesson'),
		icon: markRaw(h(FileText, iconProps)),
		completed: false,
		dependsOn: 'create_first_chapter',
		onClick: async () => {
			minimize.value = true
			let course = await getFirstCourse()
			if (course) {
				router.push({
					name: 'CourseDetail',
					params: { courseName: course },
					hash: '#settings',
				})
			} else {
				openFormRoute(router, { name: 'NewCourse' })
			}
		},
	},
	{
		name: 'create_first_quiz',
		title: __('Create your first quiz'),
		icon: markRaw(h(CircleHelp, iconProps)),
		completed: false,
		dependsOn: 'create_first_course',
		onClick: () => {
			minimize.value = true
			router.push({ name: 'Quizzes' })
		},
	},
	{
		name: 'invite_students',
		title: __('Invite your team and students'),
		icon: markRaw(h(InviteIcon, iconProps)),
		completed: false,
		onClick: () => {
			minimize.value = true
			activeTab.value = 'Members'
			isSettingsOpen.value = true
		},
	},
	{
		name: 'create_first_batch',
		title: __('Create your first batch'),
		icon: markRaw(h(Users, iconProps)),
		completed: false,
		onClick: () => {
			minimize.value = true
			router.push({ name: 'Batches' })
		},
	},
	{
		name: 'add_batch_student',
		title: __('Add students to your batch'),
		icon: markRaw(h(UserPlus, iconProps)),
		completed: false,
		dependsOn: 'create_first_batch',
		onClick: async () => {
			minimize.value = true
			let batch = await getFirstBatch()
			if (batch) {
				router.push({
					name: 'BatchDetail',
					params: {
						batchName: batch,
					},
				})
			} else {
				router.push({ name: 'Batches' })
			}
		},
	},
	{
		name: 'add_batch_course',
		title: __('Add courses to your batch'),
		icon: markRaw(h(BookText, iconProps)),
		completed: false,
		dependsOn: 'create_first_batch',
		onClick: async () => {
			minimize.value = true
			let batch = await getFirstBatch()
			if (batch) {
				router.push({
					name: 'BatchDetail',
					params: {
						batchName: batch,
					},
					hash: '#courses',
				})
			} else {
				router.push({ name: 'Batches' })
			}
		},
	},
])

const articles = ref([
	{
		title: __('Introduction'),
		opened: false,
		subArticles: [
			{ name: 'introduction', title: __('Introduction') },
			{ name: 'setting-up', title: __('Setting up') },
		],
	},
	{
		title: __('Creating a course'),
		opened: false,
		subArticles: [
			{ name: 'create-a-course', title: __('Create a course') },
			{ name: 'add-a-chapter', title: __('Add a chapter') },
			{ name: 'add-a-lesson', title: __('Add a lesson') },
		],
	},
	{
		title: __('Creating a batch'),
		opened: false,
		subArticles: [
			{ name: 'create-a-batch', title: __('Create a batch') },
			{ name: 'create-a-live-class', title: __('Create a live class') },
		],
	},
	{
		title: __('Learning Paths'),
		opened: false,
		subArticles: [{ name: 'add-a-program', title: __('Add a program') }],
	},
	{
		title: __('Assessments'),
		opened: false,
		subArticles: [
			{ name: 'quizzes', title: __('Quizzes') },
			{ name: 'assignments', title: __('Assignments') },
		],
	},
	{
		title: __('Certification'),
		opened: false,
		subArticles: [
			{ name: 'issue-a-certificate', title: __('Issue a Certificate') },
			{
				name: 'custom-certificate-templates',
				title: __('Custom Certificate Templates'),
			},
		],
	},
	{
		title: __('Monetization'),
		opened: false,
		subArticles: [
			{
				name: 'setting-up-payment-gateway',
				title: __('Setting up payment gateway'),
			},
		],
	},
	{
		title: __('Settings'),
		opened: false,
		subArticles: [{ name: 'roles', title: __('Roles') }],
	},
])

const setUpOnboarding = () => {
	if (userResource.data?.is_system_manager) {
		onboardingDetails = useOnboarding('learning')
		onboardingDetails.setUp(steps)
		isOnboardingStepsCompleted = onboardingDetails.isOnboardingStepsCompleted
		showOnboarding.value = true
	}
}

watch(userResource, async () => {
	await userResource.promise
	if (userResource.data) {
		isModerator.value = userResource.data.is_moderator
		isInstructor.value = userResource.data.is_instructor
		await programs.reload()
		setUpOnboarding()
	}
	updateSidebarLinks()
})

watch(settingsStore.settings, () => {
	updateSidebarLinks()
})

watch(
	() => sidebarSettings.data,
	() => updateSidebarLinks(),
	{ deep: true }
)

const updateSidebarLinks = () => {
	sidebarLinks.value = getSidebarLinks()
	updateSidebarLinksVisibility()
	updateUnreadCount()
}

const redirectToWebsite = () => {
	openExternal('https://frappe.io/learning')
}

const isStudent = computed(() => {
	return userResource.data?.is_student
})

const profileIsComplete = computed(() => {
	return (
		userResource.data?.user_image &&
		userResource.data?.headline &&
		userResource.data?.bio
	)
})

onUnmounted(() => {
	if (socket) {
		socket.off('publish_lms_notifications')
	}
	window.removeEventListener('keydown', onKeyboardShortcut)
})
</script>
