type Props = {
  onOpenAddFriend: () => void;
  onOpenCreateGroup: () => void;
};

export const PlusPage = ({ onOpenAddFriend, onOpenCreateGroup }: Props): JSX.Element => (
  <div className="flex h-full flex-col rounded-2xl border border-white/20 bg-white/10 p-6">
    <h2 className="mb-4 text-lg font-semibold">Действия</h2>
    <div className="grid gap-3 md:max-w-md">
      <button className="rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-black" onClick={onOpenAddFriend} type="button">
        Добавить в друзья
      </button>
      <button className="rounded-xl bg-indigo-400 px-4 py-3 font-semibold text-black" onClick={onOpenCreateGroup} type="button">
        Создать группу
      </button>
    </div>
  </div>
);
