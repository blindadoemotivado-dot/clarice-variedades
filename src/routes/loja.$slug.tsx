import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/loja/$slug')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/',
      search: { loja: params.slug },
    });
  },
  component: () => null,
});
