import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/magic/cards")({
  component: () => <Outlet />,
});
