import { openExternal } from '@/utils/openExternal'
import { toggleTheme } from '@/utils/theme'

export function getHelpOptions(settingsStore?: any) {
	return [
		{
			group: '',
			items: [
				{
					label: 'Documentation',
					onClick: () => {
						openExternal('https://docs.erpnext.com/')
					},
				},
				{
					label: 'User Forum',
					onClick: () => {
						openExternal('https://discuss.frappe.io')
					},
				},
				{
					label: 'Frappe School',
					onClick: () => {
						openExternal('https://frappe.school?utm_source=in_app')
					},
				},
				{
					label: 'Report an Issue',
					onClick: () => {
						openExternal('https://github.com/frappe/erpnext/issues')
					},
				},
				{
					label: 'About',
					onClick: () => {
						if (typeof window !== 'undefined' && (window as any).frappe?.ui?.toolbar?.show_about) {
							(window as any).frappe.ui.toolbar.show_about()
						} else {
							openExternal('https://frappe.io')
						}
					},
				},
				{
					label: 'Keyboard Shortcuts',
					onClick: (event: any) => {
						if (typeof window !== 'undefined' && (window as any).frappe?.ui?.toolbar?.show_shortcuts) {
							(window as any).frappe.ui.toolbar.show_shortcuts(event)
						} else if (settingsStore) {
							settingsStore.isCommandPaletteOpen = true
						}
					},
				},
				{
					label: 'Frappe Support',
					onClick: () => {
						openExternal('https://frappe.io/support')
					},
				},
			],
		},
	]
}

export function getUserDropdownOptions(user: any, sessStore?: any) {
	const userIdentifier = user?.email || user?.name || user?.username || 'Administrator'

	return [
		{
			group: '',
			items: [
				{
					label: 'My Profile',
					onClick: () => {
						window.location.href = '/app/user-profile'
					},
				},
				{
					label: 'My Settings',
					onClick: () => {
						window.location.href = `/app/user/${encodeURIComponent(userIdentifier)}`
					},
				},
				{
					label: 'Session Defaults',
					onClick: () => {
						if (typeof window !== 'undefined' && (window as any).frappe?.ui?.toolbar?.setup_session_defaults) {
							(window as any).frappe.ui.toolbar.setup_session_defaults()
						} else {
							window.location.href = '/app/session-default'
						}
					},
				},
				{
					label: 'Reload',
					onClick: () => {
						window.location.reload()
					},
				},
				{
					label: 'View Website',
					onClick: () => {
						openExternal('/')
					},
				},
				{
					label: 'Apps',
					onClick: () => {
						window.location.href = '/apps'
					},
				},
				{
					label: 'Toggle Full Width',
					onClick: () => {
						if (typeof window !== 'undefined' && (window as any).frappe?.ui?.toolbar?.toggle_full_width) {
							(window as any).frappe.ui.toolbar.toggle_full_width()
						} else {
							document.body.classList.toggle('full-width')
						}
					},
				},
				{
					label: 'Toggle Theme',
					onClick: () => {
						toggleTheme()
					},
				},
				{
					label: 'Manage Billing',
					onClick: () => {
						window.location.href = '/app/billing'
					},
				},
			],
		},
		{
			group: '',
			items: [
				{
					label: 'Log out',
					onClick: () => {
						if (sessStore?.logout) {
							sessStore.logout.submit().then(() => {
								window.location.reload()
							})
						} else {
							window.location.href = '/login'
						}
					},
				},
			],
		},
	]
}

export function getUserAvatarStyle(user: any) {
	const text = (user?.full_name || user?.name || user?.username || 'Administrator').trim()
	if (text.toLowerCase().startsWith('admin') || text.charAt(0).toUpperCase() === 'A') {
		return { backgroundColor: '#def7ec', color: '#03543f' }
	}
	let hash = 0
	for (let i = 0; i < text.length; i++) {
		hash = (hash << 5) - hash + text.charCodeAt(i)
		hash |= 0
	}
	const palettes = [
		{ bg: '#fed7aa', text: '#c2410c' },
		{ bg: '#fce7f3', text: '#be185d' },
		{ bg: '#dbeafe', text: '#1d4ed8' },
		{ bg: '#def7ec', text: '#03543f' },
		{ bg: '#def7ec', text: '#03543f' },
		{ bg: '#fee2e2', text: '#b91c1c' },
		{ bg: '#fef3c7', text: '#b45309' },
		{ bg: '#f3e8ff', text: '#6b21a8' },
	]
	const idx = Math.abs(hash) % palettes.length
	return {
		backgroundColor: palettes[idx].bg,
		color: palettes[idx].text,
	}
}

export function getUserAvatarLetter(user: any) {
	const text = (user?.full_name || user?.name || user?.username || 'A').trim()
	return text.charAt(0).toUpperCase() || 'A'
}
