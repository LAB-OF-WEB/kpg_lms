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
				class="kpg-lms-toggle"
				:aria-label="__('Open menu')"
				:aria-expanded="drawerOpen ? 'true' : 'false'"
				aria-controls="kpg-lms-drawer"
				@click="drawerOpen = true"
			>
				<span class="lucide-menu h-4 w-4 block" aria-hidden="true" />
			</button>
			<span class="kpg-lms-topbar-title">{{ __('Learning') }}</span>
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
				<span class="lucide-x h-4 w-4 block" aria-hidden="true" />
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
// KPG drawer replaces the old bottom tab bar (per client: one consistent
// shell on every screen size). The drawer reuses AppSidebar, so the Back to
// Desk link, gating and KPG skin are identical to desktop by construction.
import { skipToContent } from '@/utils/a11y'
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AppSidebar from '@/components/Sidebar/AppSidebar.vue'

const router = useRouter()
const drawerOpen = ref(false)

watch(
	() => router.currentRoute.value.fullPath,
	() => {
		drawerOpen.value = false
	}
)

const onKey = (e) => {
	if (e.key === 'Escape') drawerOpen.value = false
}

onMounted(() => {
	window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
	window.removeEventListener('keydown', onKey)
})
</script>
