import clsx from "clsx";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function WidgetCard({ children, className }: Props) {
  return (
    <div
      className={clsx(
        "relative mx-auto w-full max-w-md rounded-2xl border border-black/5 bg-white p-4 shadow-xl",
        className
      )}
    >
      {children}
    </div>
  );
}
