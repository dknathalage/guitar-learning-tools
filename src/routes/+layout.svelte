<script>
	import '../app.css';
	import Toast from '$lib/components/Toast.svelte';
	let { children } = $props();
</script>

<Toast />
{@render children()}
