import { Empty } from "@/components/ui";
export default function NotFound() {
  return (
    <Empty
      title="That page is off the map."
      text="Let’s get you back to discovering good things."
      href="/"
      action="Back to the marketplace"
    />
  );
}
