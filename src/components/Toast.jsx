import { create } from 'zustand';

export const useToastStore = create((set, get) => ({
    message: '',
    type: 'info',
    visible: false,
    _timer: null,

    show(message, type = 'info', duration = 3500) {
        clearTimeout(get()._timer);
        const _timer = setTimeout(() => set({ visible: false }), duration);
        set({ message, type, visible: true, _timer });
    },
}));

// Also export as useToast for backward compat
export const useToast = useToastStore;

// Convenience singleton
export const toast = {
    success: (msg, dur) => useToastStore.getState().show(msg, 'success', dur),
    error: (msg, dur) => useToastStore.getState().show(msg, 'error', dur),
    info: (msg, dur) => useToastStore.getState().show(msg, 'info', dur),
};
