import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rectangular" | "circular";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "text",
  width,
  height,
}) => {
  const baseClasses = "animate-pulse bg-gray-200 rounded";

  const variantClasses = {
    text: "h-4",
    rectangular: "h-8",
    circular: "rounded-full",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height)
    style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

interface SkeletonListProps {
  count: number;
  renderItem: (index: number) => React.ReactNode;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count,
  renderItem,
}) => {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <React.Fragment key={index}>{renderItem(index)}</React.Fragment>
      ))}
    </>
  );
};
