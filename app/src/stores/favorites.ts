import { defineStore } from 'pinia'
import type { FavoriteItem } from '@/domain/models'
import { api } from '@/services/api'

export const useFavoritesStore = defineStore('favorites', {
  state: () => ({ items: [] as FavoriteItem[], loading: false }),
  actions: {
    async load() { this.loading = true; try { this.items = await api.getFavorites() } finally { this.loading = false } },
    async remove(id: string) { await api.deleteFavorite(id); this.items = this.items.filter((item) => item.id !== id) },
  },
})
