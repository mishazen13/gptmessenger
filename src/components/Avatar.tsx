
type Props = {
  name: string;
  size?: number;
};

export const Avatar = ({ name, size = 36 }: Props): JSX.Element => {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-cyan-400/25 font-semibold text-cyan-100"
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
};
