<template>
	<div class="relative flex h-full flex-col">
		<a
			href="#scrollContainer"
			@click.prevent="skipToContent('scrollContainer')"
			class="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface-base focus:px-4 focus:py-2 focus:text-ink-gray-9 focus:shadow-md focus:outline-none focus:ring-2 focus:ring-outline-gray-3"
		>
			{{ __('Skip to main content') }}
		</a>
		<header class="kpg-lms-topbar">
			<a
				v-if="deskUrl"
				:href="deskUrl"
				class="kpg-lms-logo !h-9 !min-h-9 !w-auto !bg-transparent !border-0 !p-0"
				:aria-label="__('Back to Desk')"
			>
				<img
					:src="kpgLogo"
					alt="KPG"
					class="!h-8"
					onerror="this.outerHTML='<div class=\'kpg-lms-logo-fallback\'>KPG</div>';"
				/>
			</a>
			<span class="kpg-lms-topbar-title">{{ __('Learning') }}</span>
			<button
				v-if="canShowDesk"
				type="button"
				class="kpg-lms-toggle"
				:aria-label="__('Back to Desk')"
				@click="goDesk"
			>
				<span class="lucide-arrow-left size-4" aria-hidden="true" />
			</button>
		</header>
		<div class="h-full flex-1">
			<div class="flex h-dvh text-base bg-surface-base">
				<main
					class="w-full overflow-auto focus:outline-none"
					id="scrollContainer"
					tabindex="-1"
				>
					<slot />
				</main>
			</div>
		</div>
		<button
			v-if="canShowDesk"
			type="button"
			class="kpg-lms-back-pill"
			:aria-label="__('Back to Desk')"
			@click="goDesk"
		>
			<span class="lucide-arrow-left size-4" aria-hidden="true" />
			{{ __('Back to Desk') }}
		</button>
	</div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { skipToContent } from '@/utils/a11y'
import { usersStore } from '@/stores/user'

const { userResource } = usersStore()

const kpgLogo = '/assets/kpg_crm/images/kpg.jpeg'

const canShowDesk = computed(() =>
	Boolean(
		(userResource.data as any)?.can_access_desk &&
			(userResource.data as any)?.desk_url
	)
)

const deskUrl = computed(() => {
	return (userResource.data as any)?.desk_url || null
})

const goDesk = () => {
	const url = (userResource.data as any)?.desk_url
	if (url) window.location.href = url
}
</script>
