import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/fab/cards")({
  component: () => <Outlet />,
});
