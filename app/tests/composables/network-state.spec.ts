import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import { useNetworkState } from '@/composables/useNetworkState'

it('responds to browser offline events and removes its listeners when leaving the page', async () => {
  const navigatorOnline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  const removeListener = vi.spyOn(window, 'removeEventListener')
  const onNetworkStatusChange = vi.fn(), offNetworkStatusChange = vi.fn()
  vi.stubGlobal('uni', { onNetworkStatusChange, offNetworkStatusChange })
  const wrapper = mount(defineComponent({ setup() { const { online } = useNetworkState(); return () => h('span', online.value ? 'online' : 'offline') } }))
  try {
    navigatorOnline.mockReturnValue(false)
    window.dispatchEvent(new Event('offline'))
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('offline')
    onNetworkStatusChange.mock.calls[0][0]({ isConnected: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('offline')
    navigatorOnline.mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toBe('online')
    wrapper.unmount()
    expect(removeListener.mock.calls.map(([event]) => event)).toEqual(expect.arrayContaining(['online', 'offline']))
    expect(offNetworkStatusChange).toHaveBeenCalledWith(onNetworkStatusChange.mock.calls[0][0])
  } finally { wrapper.unmount(); navigatorOnline.mockRestore(); removeListener.mockRestore() }
})
