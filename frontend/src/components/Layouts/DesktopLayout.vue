<template>
	<div class="flex h-dvh w-screen">
		<a
			href="#main-content"
			@click.prevent="skipToContent('main-content')"
			class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface-base focus:px-4 focus:py-2 focus:text-ink-gray-9 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
		>
			{{ __('Skip to main content') }}
		</a>
		<!-- KPG styled rail: fixed 210px, full height, KPG gradient. -->
		<div
			class="kpg-lms-sidebar h-full shrink-0"
			:class="{ 'kpg-lms-collapsed': isCollapsed }"
		>
			<AppSidebar />
		</div>
		<div class="flex flex-1 flex-col min-w-0">
			<header class="kpg-lms-topbar">
				<button
					v-if="isCollapsed"
					type="button"
					class="kpg-lms-toggle"
					:aria-label="__('Open menu')"
					@click="toggleCollapse"
				>
					<span class="lucide-menu h-4 w-4 block" aria-hidden="true" />
				</button>
				<input
					type="search"
					class="kpg-lms-topbar-search"
					readonly
					:placeholder="__('Search courses, batches, people…')"
					@focus.prevent="openPalette"
					@click.prevent="openPalette"
				/>
				<span class="kpg-lms-topbar-title">{{ __('Learning') }}</span>
			</header>
			<main
				id="main-content"
				tabindex="-1"
				class="kpg-lms-main flex-1 flex flex-col overflow-auto focus:outline-none"
			>
				<slot />
			</main>
		</div>
	</div>
</template>
<script setup>
import { computed } from 'vue'
import { skipToContent } from '@/utils/a11y'
import AppSidebar from '@/components/Sidebar/AppSidebar.vue'
import { useSidebar } from '@/stores/sidebar'
import { useSettings } from '@/stores/settings'

const sidebarStore = useSidebar()
const settingsStore = useSettings()

const isCollapsed = computed(() => sidebarStore.isSidebarCollapsed)

function toggleCollapse() {
	sidebarStore.isSidebarCollapsed = false
	localStorage.setItem(
		'isSidebarCollapsed',
		JSON.stringify(sidebarStore.isSidebarCollapsed)
	)
}

function openPalette(e) {
	if (e) e.preventDefault()
	settingsStore.isCommandPaletteOpen = true
}
</script>
