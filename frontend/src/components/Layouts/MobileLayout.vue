<template>
	<div class="relative flex h-dvh flex-col">
		<a
			href="#scrollContainer"
			@click.prevent="skipToContent('scrollContainer')"
			class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface-base focus:px-4 focus:py-2 focus:text-ink-gray-9 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
		>
			{{ __('Skip to main content') }}
		</a>
		<header class="kpg-lms-topbar">
			<button
				type="button"
				class="kpg-rail-handle-btn kpg-lms-toggle"
				:aria-label="__('Open menu')"
				:aria-expanded="drawerOpen ? 'true' : 'false'"
				aria-controls="kpg-lms-drawer"
				@click="drawerOpen = true"
			>
				<Menu class="h-4 w-4" aria-hidden="true" />
			</button>

			<router-link
				to="/"
				class="inline-flex items-center mx-2 shrink-0"
				:aria-label="__('Home')"
			>
				<img
					:src="safeUrl(brandLogo)"
					alt="KPG"
					class="h-7 w-auto max-w-[85px] object-contain"
					onerror="this.outerHTML='<div class=\'kpg-logo-fallback\'>KPG</div>';"
				/>
			</router-link>

			<!-- CRM autocomplete search bar (matches Desk 1:1) -->
			<LmsSearchBar />

			<div class="kpg-topbar-right">
				<span class="kpg-branch-label" :title="branchLabel">
					<span class="kpg-branch-dot"></span>
					<span class="kpg-branch-text">{{ branchLabel }}</span>
				</span>

				<button
					type="button"
					class="kpg-topbar-btn"
					data-notifications-trigger
					:aria-label="__('Notifications')"
					:title="__('Notifications')"
					@click="toggleNotifications"
				>
					<Bell class="h-4 w-4" aria-hidden="true" />
					<span v-if="unreadCount > 0" class="kpg-unread-dot" aria-hidden="true" />
				</button>

				<div class="kpg-topbar-divider"></div>

				<Dropdown :options="helpOptions" align="end" :offset="6">
					<button
						type="button"
						class="kpg-topbar-help"
						:aria-label="__('Help')"
						:title="__('Help')"
					>
						<span>{{ __('Help') }}</span>
						<ChevronDown class="h-3 w-3" aria-hidden="true" />
					</button>
				</Dropdown>

				<Dropdown :options="userDropdownOptions" align="end" :offset="6">
					<button
						type="button"
						class="kpg-topbar-avatar"
						:aria-label="__('User menu')"
						:title="userFullName"
					>
						<img
							v-if="userImage"
							:src="safeUrl(userImage)"
							:alt="userFullName"
							class="kpg-avatar-circle object-cover"
						/>
						<span
							v-else
							class="kpg-avatar-circle kpg-avatar-initial"
							:style="avatarBadgeStyle"
						>
							{{ avatarLetter }}
						</span>
					</button>
				</Dropdown>
			</div>
		</header>
		<div
			class="kpg-lms-scrim"
			:class="{ show: drawerOpen }"
			aria-hidden="true"
			@click="drawerOpen = false"
		/>
		<div
			id="kpg-lms-drawer"
			class="kpg-lms-drawer"
			:class="{ open: drawerOpen }"
			role="dialog"
			:aria-label="__('Menu')"
			:aria-hidden="drawerOpen ? 'false' : 'true'"
		>
			<button
				type="button"
				class="kpg-lms-close"
				:aria-label="__('Close menu')"
				@click="drawerOpen = false"
			>
				<X class="h-4 w-4" aria-hidden="true" />
			</button>
			<div class="kpg-lms-sidebar h-full">
				<AppSidebar />
			</div>
		</div>
		<main
			class="kpg-lms-main flex min-h-0 flex-1 flex-col overflow-y-auto focus:outline-none"
			id="scrollContainer"
			tabindex="-1"
		>
			<slot />
		</main>
	</div>
</template>
<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getActivePinia } from 'pinia'
import { useRouter } from 'vue-router'
import { Dropdown } from 'frappe-ui'
import {
	Menu,
	X,
	Bell,
	ChevronDown,
} from 'lucide-vue-next'
import { skipToContent } from '@/utils/a11y'
import { safeUrl } from '@/utils/safeUrl'
import AppSidebar from '@/components/Sidebar/AppSidebar.vue'
import LmsSearchBar from '@/components/Controls/LmsSearchBar.vue'
import { useSettings } from '@/stores/settings'
import { usersStore } from '@/stores/user'
import { sessionStore } from '@/stores/session'
import {
	getHelpOptions,
	getUserDropdownOptions,
	getUserAvatarLetter,
	getUserAvatarStyle,
} from '@/utils/topbarDropdowns'
import {
	unreadCount,
	toggleNotifications,
	loadUnreadCount,
} from '@/stores/notifications'

const router = useRouter()
const drawerOpen = ref(false)

const settingsStore = getActivePinia() ? useSettings() : null
const userStore = getActivePinia() ? usersStore() : null
const sessStore = getActivePinia() ? sessionStore() : null

const userResource = computed(() => userStore?.userResource || { data: null })
const brandLogo = computed(() => {
	return (
		sessStore?.branding?.data?.banner_image?.file_url ||
		sessStore?.branding?.data?.app_logo ||
		'/assets/kpg_crm/images/kpg.jpeg'
	)
})

onMounted(() => {
	window.addEventListener('keydown', onKey)
	if (getActivePinia()) {
		loadUnreadCount()
	}
})

onUnmounted(() => {
	window.removeEventListener('keydown', onKey)
})

const onKey = (e) => {
	if (e.key === 'Escape') drawerOpen.value = false
}

watch(
	() => router?.currentRoute?.value?.fullPath,
	() => {
		drawerOpen.value = false
	}
)

const branchLabel = computed(() => {
	try {
		const label = sessionStorage.getItem('kpg_branch_label')
		return label === 'All' ? 'All Branches' : (label || 'All Branches')
	} catch {
		return 'All Branches'
	}
})

const userFullName = computed(() => {
	const data = userResource.value.data
	return data?.full_name || data?.name || 'User'
})

const userImage = computed(() => {
	return userResource.value.data?.user_image || null
})

const avatarLetter = computed(() => {
	return getUserAvatarLetter(userResource.value?.data)
})

const avatarBadgeStyle = computed(() => {
	return getUserAvatarStyle(userResource.value?.data)
})

const userDropdownOptions = computed(() => {
	return getUserDropdownOptions(userResource.value?.data, sessStore)
})

const helpOptions = computed(() => {
	return getHelpOptions(settingsStore)
})
</script>