import { insforge } from './insforge'
import { compressImage } from './compressImage'

export async function uploadPlayerPhoto(file: File) {
  const optimized = await compressImage(file)
  const { data, error } = await insforge.storage.from('player-photos').uploadAuto(optimized)
  if (error || !data) {
    return { url: null as string | null, key: null as string | null, error }
  }
  return { url: data.url, key: data.key, error: null }
}
