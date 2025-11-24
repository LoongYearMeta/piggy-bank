import { onBeforeUnmount, onMounted } from 'vue';

export function useBodyClass(className: string) {
	const add = () => {
		if (typeof document === 'undefined') return;
		document.body.classList.add(className);
	};

	const remove = () => {
		if (typeof document === 'undefined') return;
		document.body.classList.remove(className);
	};

	onMounted(add);
	onBeforeUnmount(remove);
}

