import { CareChecklist } from "@/components/CareChecklist";

type Fields = {
  fed: boolean;
  watered: boolean;
  litterCleaned: boolean;
  groomed: boolean;
  playedWith: boolean;
  timothy: boolean;
  gojiBerry: boolean;
};

export function CareDayPanel({
  rabbitId,
  date,
  am,
  pm,
}: {
  rabbitId: string;
  date: string;
  am: { fields: Fields; loggedByName?: string | null } | null;
  pm: { fields: Fields; loggedByName?: string | null } | null;
}) {
  const empty: Fields = {
    fed: false,
    watered: false,
    litterCleaned: false,
    groomed: false,
    playedWith: false,
    timothy: false,
    gojiBerry: false,
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-xs font-semibold text-stone-500">🌅 朝</p>
        <CareChecklist
          rabbitId={rabbitId}
          date={date}
          period="am"
          initial={am?.fields ?? empty}
          loggedByName={am?.loggedByName}
        />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-stone-500">🌙 夜</p>
        <CareChecklist
          rabbitId={rabbitId}
          date={date}
          period="pm"
          initial={pm?.fields ?? empty}
          loggedByName={pm?.loggedByName}
        />
      </div>
    </div>
  );
}
