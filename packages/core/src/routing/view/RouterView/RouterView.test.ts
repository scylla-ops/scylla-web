import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { msg } from '@lingui/core/macro';
import {
  currentPathname,
  navigateTo,
  routePathname,
  routeTrail,
  setAppNavigator,
  type PageLoader,
  type RoutePermission,
} from '@scylla/core-sdk';
import {
  CREATE_SECRET,
  LIST_SECRETS,
  READ_PROJECT,
  granted,
} from '../../__test__/test-permission.fixture.ts';
import type { AppRouterConfig } from '../../compilation/compile-routes.ts';
import { createAppRouter } from '../../runtime/app-router.ts';
import TestFallback from './fixtures/TestFallback.fixture.svelte';
import TestFrame from './fixtures/TestFrame.fixture.svelte';
import TestGuard from './fixtures/TestGuard.fixture.svelte';
import TestOtherPage from './fixtures/TestOtherPage.fixture.svelte';
import TestPage from './fixtures/TestPage.fixture.svelte';
import TestLayout from './fixtures/TestLayout.fixture.svelte';
import TestWrapper from './fixtures/TestWrapper.fixture.svelte';
import RouterView from './RouterView.svelte';

const page: PageLoader = () => Promise.resolve({ default: TestPage });
const otherPage: PageLoader = () => Promise.resolve({ default: TestOtherPage });

const config: AppRouterConfig = {
  mounts: {
    public: {},
    app: { layout: TestLayout, shell: true },
    organization: { parent: 'app', path: ':slug', wrapper: TestWrapper },
    project: { parent: 'organization', path: 'projects/:projectId' },
  },
  fallback: TestFallback,
  guard: TestGuard,
  shell: TestFrame,
  modules: [
    {
      id: 'test',
      routes: {
        public: [{ path: 'login', page: otherPage }],
        organization: [
          { redirect: 'secrets' },
          {
            path: 'secrets',
            permission: LIST_SECRETS,
            breadcrumb: () => ({ label: msg`Secrets` }),
            page,
            children: [
              {
                path: 'new',
                permission: CREATE_SECRET,
                breadcrumb: () => ({ label: msg`New` }),
                page,
              },
              { path: ':secretId', page },
            ],
          },
          { path: 'open', breadcrumb: () => ({ label: msg`Open` }), page: otherPage },
        ],
      },
    },
  ],
};

const grantOnly = (...permissions: RoutePermission[]) => {
  granted.clear();
  permissions.forEach(permission => granted.add(permission));
};

const renderAt = async (pathname: string) => {
  const navigator = createAppRouter(config);
  setAppNavigator(navigator);
  navigator.navigate(pathname, { replace: true });
  await expect.poll(() => routePathname()).toBe(pathname);
  return render(RouterView);
};

beforeEach(() => granted.clear());

afterEach(() => {
  setAppNavigator(null);
});

describe('the app router', () => {
  it('renders the page of the URL inside the layout, the shell and the wrappers, in that order', async () => {
    await renderAt('/acme/open');

    expect(await screen.findByTestId('other-page')).toBeInTheDocument();
    expect(screen.getByTestId('layout')).toContainElement(screen.getByTestId('frame'));
    expect(screen.getByTestId('frame')).toContainElement(screen.getByTestId('wrapper'));
    expect(screen.getByTestId('wrapper')).toHaveAttribute('data-slug', 'acme');
  });

  it('gives the route parameters to the page as props', async () => {
    grantOnly(LIST_SECRETS);
    await renderAt('/acme/secrets/secret-1');

    expect(await screen.findByTestId('page')).toHaveTextContent('slug=acme secretId=secret-1');
  });

  it('renders a public route without the layout or the shell', async () => {
    await renderAt('/login');

    expect(await screen.findByTestId('other-page')).toBeInTheDocument();
    expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
    expect(screen.queryByTestId('frame')).not.toBeInTheDocument();
  });

  it('renders the fallback, without the layout or the shell, for a URL that no route matches', async () => {
    await renderAt('/acme/nothing/here');

    expect(await screen.findByTestId('fallback')).toBeInTheDocument();
    expect(screen.queryByTestId('layout')).not.toBeInTheDocument();
  });

  it('follows a redirect relative to the route', async () => {
    grantOnly(LIST_SECRETS);
    await renderAt('/acme');

    expect(await screen.findByTestId('page')).toHaveTextContent('slug=acme');
    expect(currentPathname()).toBe('/acme/secrets');
  });

  it('shows the page of the new URL after a navigation', async () => {
    await renderAt('/acme/open');
    await screen.findByTestId('other-page');

    grantOnly(LIST_SECRETS);
    navigateTo('/acme/secrets/secret-2');

    expect(await screen.findByTestId('page')).toHaveTextContent('secretId=secret-2');
  });

  it('resolves a relative navigation from the current page', async () => {
    grantOnly(LIST_SECRETS);
    await renderAt('/acme/secrets/secret-1');
    await screen.findByTestId('page');

    navigateTo('..');

    await expect.poll(() => currentPathname()).toBe('/acme/secrets');
  });

  it('keeps the query string apart from the pathname', async () => {
    await renderAt('/acme/open');
    await screen.findByTestId('other-page');

    navigateTo('/acme/open?nodes=build,test', { replace: true });

    await expect.poll(() => window.location.search).toBe('?nodes=build,test');
    expect(currentPathname()).toBe('/acme/open');
  });
});

describe('the route guard', () => {
  it('renders the page when no route on the URL declares a permission', async () => {
    await renderAt('/acme/open');

    expect(await screen.findByTestId('other-page')).toBeInTheDocument();
  });

  it("puts a page that declares a permission inside the access policy's guard", async () => {
    grantOnly(READ_PROJECT);
    await renderAt('/acme/secrets');

    expect(await screen.findByTestId('denied')).toBeInTheDocument();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
  });

  it('checks a child that asks for more than its parent against its own permission', async () => {
    grantOnly(LIST_SECRETS);
    await renderAt('/acme/secrets/new');

    expect(await screen.findByTestId('denied')).toBeInTheDocument();
    expect(screen.queryByTestId('page')).not.toBeInTheDocument();
  });

  it('guards a page with its own permission only, never with the one of its parent', async () => {
    grantOnly(READ_PROJECT);
    await renderAt('/acme/secrets/secret-1');

    expect(await screen.findByTestId('page')).toHaveTextContent('secretId=secret-1');
  });

  it('does not treat a route with only a breadcrumb as a permission', async () => {
    await renderAt('/acme/open');

    expect(await screen.findByTestId('other-page')).toBeInTheDocument();
    expect(screen.queryByTestId('denied')).not.toBeInTheDocument();
  });
});

describe('the route trail', () => {
  it('lists the crumbs on the URL with the pathname of their route', async () => {
    grantOnly(LIST_SECRETS, CREATE_SECRET);
    await renderAt('/acme/secrets/new');
    await screen.findByTestId('page');

    expect(routeTrail().map(crumb => crumb.pathname)).toEqual([
      '/acme/secrets',
      '/acme/secrets/new',
    ]);
  });
});

describe('the links of the app', () => {
  it('opens a link of the app without a page load', async () => {
    await renderAt('/acme/secrets/secret-1');
    const link = document.createElement('a');
    link.href = '/acme/open';
    link.textContent = 'open';
    document.body.append(link);

    await userEvent.click(link);

    expect(await screen.findByTestId('other-page')).toBeInTheDocument();
    expect(currentPathname()).toBe('/acme/open');
    link.remove();
  });

  it('leaves a link that opens a new tab to the browser', async () => {
    await renderAt('/acme/open');
    const link = document.createElement('a');
    link.href = '/acme/secrets';
    link.target = '_blank';
    document.body.append(link);
    let prevented: boolean | undefined;
    const record = (event: MouseEvent) => {
      prevented = event.defaultPrevented;
      event.preventDefault();
    };
    window.addEventListener('click', record);

    await userEvent.click(link);

    expect(prevented).toBe(false);
    expect(currentPathname()).toBe('/acme/open');
    window.removeEventListener('click', record);
    link.remove();
  });

  it('follows the browser back to the previous page', async () => {
    await renderAt('/acme/open');
    navigateTo('/acme/secrets/secret-3');
    await screen.findByTestId('page');

    history.back();

    expect(await screen.findByTestId('other-page')).toBeInTheDocument();
  });
});
