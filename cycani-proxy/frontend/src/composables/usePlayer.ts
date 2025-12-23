import { ref, readonly, onUnmounted } from 'vue'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

export function usePlayer() {
  const player = ref<Plyr | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)

  function initPlayer(element: string | HTMLElement) {
    const target = typeof element === 'string' ? element : element

    player.value = new Plyr(target, {
      controls: [
        'play-large',
        'play',
        'progress',
        'current-time',
        'duration',
        'mute',
        'volume',
        'pip',
        'fullscreen'
      ],
      autoplay: false
    })

    player.value.on('play', () => {
      isPlaying.value = true
    })

    player.value.on('pause', () => {
      isPlaying.value = false
      currentTime.value = player.value?.currentTime || 0
    })

    player.value.on('timeupdate', () => {
      currentTime.value = player.value?.currentTime || 0
    })

    player.value.on('loadedmetadata', () => {
      duration.value = player.value?.duration || 0
    })

    return player.value
  }

  async function loadVideo(url: string, autoplay = false) {
    if (!player.value) return

    player.value.source = {
      type: 'video',
      sources: [{ src: url, type: 'video/mp4' }]
    }

    if (autoplay) {
      try {
        await player.value.play()
      } catch (err) {
        console.warn('Autoplay prevented by browser', err)
      }
    }
  }

  function play() {
    player.value?.play()
  }

  function pause() {
    player.value?.pause()
  }

  function seek(time: number) {
    if (player.value) {
      player.value.currentTime = time
    }
  }

  function stop() {
    if (player.value) {
      player.value.stop()
    }
  }

  function destroy() {
    player.value?.destroy()
    player.value = null
  }

  onUnmounted(() => {
    destroy()
  })

  return {
    player: readonly(player),
    isPlaying: readonly(isPlaying),
    currentTime: readonly(currentTime),
    duration: readonly(duration),
    initPlayer,
    loadVideo,
    play,
    pause,
    seek,
    stop,
    destroy
  }
}
