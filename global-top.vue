<!-- hide the footer from "cover" layout -->
<template>
  <img
    v-if="$nav.currentLayout !== 'cover' && $nav.currentPage !== 1"
    class="absolute top-4 right-4 w-32 h-auto pointer-events-none" src="./assets/thinkcell_logo_color_RGB.svg" alt="thinkcell logo"/>

  <footer
    v-if="$nav.currentLayout !== 'cover' && $nav.currentLayout !== 'image'"
  >
    <Scroll/>
    <div class="absolute bottom-5 left-0 right-5 text-right text-xs"><SlideCurrentNo/>/<SlidesTotal/></div>
    <div class="progress-track" aria-hidden="true">
      <div
        class="progress-bar"
        :style="{ width: `${($nav.currentPage / $nav.total) * 100}%` }"
      />
    </div>
  </footer>
</template>

<style>
.progress-track {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  z-index: 10;
}

.progress-bar {
  height: 100%;
  background: rgb(233, 22, 60);
  transition: width 0.3s ease;
}
</style>
