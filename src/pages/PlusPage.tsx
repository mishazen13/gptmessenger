
type Props = { onOpenAddFriend: () => void };

export const PlusPage = ({ onOpenAddFriend }: Props): JSX.Element => (
  <div className="rounded-2xl border border-white/20 bg-white/10 p-6">
    <h2 className="mb-4 text-lg font-semibold">Действие +</h2>
    <button className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black" onClick={onOpenAddFriend} type="button">
      Перейти к добавлению друзей
    </button>
  </div>
);
