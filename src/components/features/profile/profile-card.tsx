import { ProfileEditDialog } from "@/components/dashboard/profile-edit-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ProfileCardProps {
  displayName: string;
  email: string;
  image: string;
  initials: string;
  joinedLabel: string;
  bioText: string;
  goals: string[];
}

export function ProfileCard({
  displayName,
  email,
  image,
  initials,
  joinedLabel,
  bioText,
  goals,
}: ProfileCardProps) {
  return (
    <div className="lg:col-span-4 flex flex-col gap-6">
      <div className="bg-card border-border/50 rounded-xl p-6 flex flex-col shadow-sm h-full">
        <div className="flex w-full flex-col gap-3">
          <div className="flex w-full items-start gap-4 min-w-0">
            <Avatar className="h-16 w-16 shrink-0 border-2 border-primary/10 shadow-sm">
              <AvatarImage src={image || ""} alt={displayName} />
              <AvatarFallback className="text-lg font-bold bg-primary/5 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{displayName}</h2>
              <p className="text-xs font-mono bg-muted/50 px-2 py-0.5 rounded-md w-fit max-w-full truncate text-muted-foreground">
                {email}
              </p>
              <p className="text-xs text-muted-foreground">Joined {joinedLabel}</p>
            </div>
          </div>
          <ProfileEditDialog initialName={displayName} initialBio={bioText} initialGoals={goals.join(", ")} initialImage={image} initials={initials} />
        </div>

        <div className="h-px w-full bg-border my-6" />

        {bioText ? (
          <>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-4">{bioText}</p>
          </>
        ) : null}

        {goals.length > 0 ? (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-500">Current Focus</h3>
            <p className="text-sm leading-relaxed text-foreground/80 line-clamp-3">{goals.join(" · ")}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
