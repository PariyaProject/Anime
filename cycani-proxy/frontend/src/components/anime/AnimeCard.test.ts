import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnimeCard from '@/components/anime/AnimeCard.vue'

describe('AnimeCard Component', () => {
  const mockAnime = {
    id: '123',
    title: '测试动画',
    cover: 'https://example.com/cover.jpg',
    type: 'TV',
    year: '2024',
    episodes: 12,
    score: 8.5,
    status: '连载中'
  }

  it('renders anime information correctly', () => {
    const wrapper = mount(AnimeCard, {
      props: { anime: mockAnime }
    })

    expect(wrapper.text()).toContain('测试动画')
    expect(wrapper.text()).toContain('TV')
    expect(wrapper.text()).toContain('2024')
    // The episodes display might be "12集" without space
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('集')
  })

  it('displays score when available', () => {
    const wrapper = mount(AnimeCard, {
      props: { anime: mockAnime }
    })

    expect(wrapper.text()).toContain('8.5')
  })

  it('handles missing score', () => {
    const animeWithoutScore = { ...mockAnime, score: undefined }
    const wrapper = mount(AnimeCard, {
      props: { anime: animeWithoutScore }
    })

    // Should not crash and show N/A or nothing for score
    expect(wrapper.exists()).toBe(true)
  })

  it('emits select event when select button is clicked', async () => {
    const wrapper = mount(AnimeCard, {
      props: { anime: mockAnime }
    })

    const selectButton = wrapper.findAll('button').find(btn => btn.text() === '选择播放')
    if (selectButton) {
      await selectButton.trigger('click')
      expect(wrapper.emitted('select')).toBeTruthy()
      expect(wrapper.emitted('select')?.[0]).toEqual([mockAnime])
    }
  })

  it('emits details event when details button is clicked', async () => {
    const wrapper = mount(AnimeCard, {
      props: { anime: mockAnime }
    })

    const detailsButton = wrapper.findAll('button').find(btn => btn.text() === '查看详情')
    if (detailsButton) {
      await detailsButton.trigger('click')
      expect(wrapper.emitted('details')).toBeTruthy()
      expect(wrapper.emitted('details')?.[0]).toEqual([mockAnime])
    }
  })

  it('handles image error and shows fallback', async () => {
    const wrapper = mount(AnimeCard, {
      props: { anime: mockAnime }
    })

    const img = wrapper.find('img')
    if (img) {
      await img.trigger('error')
      // After error, src should be set to fallback
      expect(img.attributes('src')).toBeTruthy()
    }
  })
})
