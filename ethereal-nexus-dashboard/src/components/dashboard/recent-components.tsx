import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DeleteIcon, PencilIcon, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function RecentComponents() {
  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/01.png" alt="Avatar" />
          <AvatarFallback>OM</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Olivia Martin</p>
          <p className="text-sm text-muted-foreground">Updated component A</p>
        </div>
        <div className="ml-auto font-medium">
          <Button variant="link" size="icon" className="text-orange-400">
            <PencilIcon />
          </Button>
        </div>
      </div>
      <div className="flex items-center">
        <Avatar className="flex h-9 w-9 items-center justify-center space-y-0 border">
          <AvatarImage src="/avatars/02.png" alt="Avatar" />
          <AvatarFallback>JL</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Jackson Lee</p>
          <p className="text-sm text-muted-foreground">Added component B</p>
        </div>
        <div className="ml-auto font-medium">
          <Button variant="link" size="icon" className="text-green-600">
            <PlusCircle />
          </Button>
        </div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/03.png" alt="Avatar" />
          <AvatarFallback>IN</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Isabella Nguyen</p>
          <p className="text-sm text-muted-foreground">Updated component C</p>
        </div>
        <div className="ml-auto font-medium">
          <Button variant="link" size="icon" className="text-orange-400">
            <PencilIcon />
          </Button>
        </div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/04.png" alt="Avatar" />
          <AvatarFallback>WK</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">William Kim</p>
          <p className="text-sm text-muted-foreground">Deleted component D</p>
        </div>
        <div className="ml-auto font-medium">
          <Button variant="link" size="icon" className="text-red-600">
            <DeleteIcon />
          </Button>
        </div>
      </div>
      <div className="flex items-center">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/05.png" alt="Avatar" />
          <AvatarFallback>SD</AvatarFallback>
        </Avatar>
        <div className="ml-4 space-y-1">
          <p className="text-sm font-medium leading-none">Sofia Davis</p>
          <p className="text-sm text-muted-foreground">Updated component E</p>
        </div>
        <div className="ml-auto font-medium">
          <Button variant="link" size="icon" className="text-orange-400">
            <PencilIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
