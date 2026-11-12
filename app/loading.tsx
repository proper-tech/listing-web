import PageLoader from '@/components/PageLoader';

// Shown inside the layout (header stays) while a route's server component loads.
export default function Loading() {
  return <PageLoader />;
}
