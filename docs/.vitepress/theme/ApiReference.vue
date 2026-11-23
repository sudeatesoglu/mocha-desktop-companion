<script setup lang="ts">
// The local API's reference, rendered from docs/openapi.yaml by Scalar.
import { ApiReference } from '@scalar/api-reference';
import '@scalar/api-reference/style.css';
import { useData } from 'vitepress';
import { computed } from 'vue';
import spec from '../../openapi.yaml?raw';

const { isDark } = useData();

const configuration = computed(() => ({
  content: spec,
  // Mocha answers only its own browser extension (ADR-0011): a request sent
  // from this page could never succeed, so the page shows examples instead.
  hideTestRequestButton: true,
  hideClientButton: true,
  // Follows the site's own light and dark switch.
  hideDarkModeToggle: true,
  forceDarkModeState: isDark.value ? 'dark' : 'light',
  // Local-first like the app: no remote fonts, no tracking, and no AI or
  // MCP feature that would send the document to Scalar's servers.
  withDefaultFonts: false,
  telemetry: false,
  agent: { disabled: true },
  mcp: { disabled: true },
  showDeveloperTools: 'never',
  showToolbar: 'never',
  documentDownloadType: 'yaml',
}));
</script>

<template>
  <ClientOnly>
    <ApiReference :configuration="configuration" />
  </ClientOnly>
</template>
