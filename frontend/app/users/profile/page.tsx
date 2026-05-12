"use client"

import { 
  User, 
  Mail, 
  DoorClosed, 
  Lock, 
  ShieldCheck,
  Save
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function UserProfilePage() {
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your personal information and account security.</p>
      </div>

      <div className="grid gap-6">
        
        {/* Personal Information Card */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your contact details and identity.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-8">
              
              {/* Avatar Section */}
              <div className="flex flex-col items-center space-y-3 sm:w-1/4">
                <Avatar className="h-24 w-24 border-4 border-slate-50">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback className="text-2xl font-bold bg-blue-100 text-blue-700">JD</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm" className="w-full text-xs h-8">
                  Change Photo
                </Button>
              </div>

              {/* Form Fields */}
              <div className="flex-1 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-slate-700 font-semibold">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input id="fullName" defaultValue="Jane Doe" className="pl-9 bg-slate-50" />
                    </div>
                  </div>

                  {/* Room Unit (Disabled / Read Only) */}
                  <div className="space-y-2">
                    <Label htmlFor="roomUnit" className="text-slate-700 font-semibold flex items-center justify-between">
                      Room / Unit
                      <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Locked</span>
                    </Label>
                    <div className="relative">
                      <DoorClosed className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input id="roomUnit" defaultValue="Apt 4B" disabled className="pl-9 bg-slate-100 cursor-not-allowed text-slate-500 font-medium" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-semibold">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input id="email" type="email" defaultValue="jane.doe@example.com" className="pl-9 bg-slate-50" />
                  </div>
                </div>
              </div>

            </div>
          </CardContent>
          <CardFooter className="border-t bg-slate-50/50 px-6 py-4 flex justify-end">
            <Button className="bg-blue-700 hover:bg-blue-800 text-white">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardFooter>
        </Card>

        {/* Security / Password Card */}
        <Card className="bg-white shadow-sm border-slate-200">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Security & Password
            </CardTitle>
            <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-slate-700 font-semibold">Current Password</Label>
              <div className="relative max-w-md">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input id="currentPassword" type="password" placeholder="Enter your current password" className="pl-9 bg-slate-50" />
              </div>
            </div>

            <div className="border-t border-slate-100 my-2 pt-4"></div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-slate-700 font-semibold">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input id="newPassword" type="password" placeholder="Enter a secure password" className="pl-9 bg-slate-50" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700 font-semibold">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input id="confirmPassword" type="password" placeholder="Re-enter your new password" className="pl-9 bg-slate-50" />
                </div>
              </div>
            </div>

          </CardContent>
          <CardFooter className="border-t bg-slate-50/50 px-6 py-4 flex justify-end">
            <Button variant="outline" className="text-slate-700 bg-white mr-3">
              Cancel
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white">
              Update Password
            </Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  )
}