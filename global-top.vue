<!-- hide the footer from "cover" layout -->
<template>
  <img
    v-if="$nav.currentLayout !== 'cover'"
    class="absolute top-4 right-4 w-32 h-auto pointer-events-none" src="./assets/think-cell_logo_RGB.svg" alt="think-cell logo"/>

  <footer
    v-if="$nav.currentLayout !== 'cover' && $nav.currentLayout !== 'image'"
  >
    <Scroll/>
  <div class="absolute bottom-5 left-0 right-5 text-right text-xs"><SlideCurrentNo/>/<SlidesTotal/></div>
  </footer>
</template>
