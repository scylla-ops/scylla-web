<script lang="ts">
  import { ErrorState } from '@scylla/ui';
  import { Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@scylla/ui/primitives';
  import { t } from '@scylla/ui/i18n';
  import { FragmentNodes, FragmentParameters } from '@base/features/pipeline';
  import { latestPackageVersion } from '@base/features/marketplace/domain/entities/market-package.entity.ts';
  import { marketplaceMessages } from '@base/features/marketplace/presentation/messages/marketplace.messages.ts';
  import AddToLibraryDialog from './AddToLibraryDialog.svelte';
  import BeforeYouAdd from './BeforeYouAdd.svelte';
  import LibraryStatusCard from './LibraryStatusCard.svelte';
  import PackageHeader from './PackageHeader.svelte';
  import PackageVersions from './PackageVersions.svelte';
  import { createPackagePage } from './package-page.state.svelte.ts';

  interface Props {
    packageId?: string;
  }

  let { packageId }: Props = $props();

  const page = createPackagePage(() => packageId ?? '');
  const pkg = $derived(page.pkg);
  const latest = $derived(pkg && latestPackageVersion(pkg));

  /** The versions card of the overview shows the latest ones; its tab shows them all. */
  const SHOWN_VERSIONS = 3;
</script>

{#if page.isLoading}
  <Skeleton class="h-72 w-full rounded-xl" />
{:else if !pkg || !latest}
  <ErrorState message={t(marketplaceMessages.notFound)} />
{:else}
  <div class="flex min-h-full w-full flex-col gap-6 pb-20">
    <PackageHeader {page} />
    <Tabs value="overview" class="gap-4">
      <TabsList>
        <TabsTrigger value="overview">{t(marketplaceMessages.overview)}</TabsTrigger>
        <TabsTrigger value="versions">{t(marketplaceMessages.versionsTab(pkg.versions.length))}</TabsTrigger>
        <TabsTrigger value="readme">{t(marketplaceMessages.readme)}</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div class="flex min-w-0 flex-col gap-4">
            <FragmentNodes nodes={latest.nodes} />
            <FragmentParameters parameters={latest.parameters} />
          </div>
          <div class="flex flex-col gap-4">
            <LibraryStatusCard {page} />
            <PackageVersions {pkg} limit={SHOWN_VERSIONS} />
            <BeforeYouAdd {pkg} />
          </div>
        </div>
      </TabsContent>
      <TabsContent value="versions">
        <PackageVersions {pkg} />
      </TabsContent>
      <TabsContent value="readme">
        <article class="max-w-3xl text-sm whitespace-pre-line">{pkg.readme}</article>
      </TabsContent>
    </Tabs>
  </div>

  <AddToLibraryDialog {page} />
{/if}
