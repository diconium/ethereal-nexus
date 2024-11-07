import { Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function LoadingComponentCard() {
    return (
        <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-6 min-h-[150px]">
                <div className="flex flex-col items-center space-y-4">
                    <Loader2 color={'#FF5600'} className="h-8 w-8 animate-spin text-primary" />
                    <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" />
                        <div className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "0.2s" }} />
                        <div className="h-2 w-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "0.4s" }} />
                    </div>
                    <p className="text-sm text-muted-foreground animate-pulse">Loading component...</p>
                </div>
            </CardContent>
        </Card>
    )
}
