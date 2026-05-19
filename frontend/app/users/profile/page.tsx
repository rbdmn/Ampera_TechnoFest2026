"use client"

import { useEffect, useMemo, useState } from "react"
import { User, Mail, DoorClosed, Lock, ShieldCheck, Save, Upload } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getMyProfile, type UserProfile } from "@/lib/user"
import { getEmail } from "@/lib/auth"
import { uploadProfilePhoto, updateProfile, changePassword } from "@/lib/api"

export default function UserProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [changingPw, setChangingPw] = useState(false)

  const [fullName, setFullName] = useState("")
  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")

  const email = useMemo(() => getEmail() ?? "", [])

  async function load() {
    const p = await getMyProfile()
    setProfile(p)
    setFullName(p.full_name ?? "")
  }

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        await load()
      } catch (e: any) {
        setError(e?.message ?? "failed_to_load_profile")
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initials = (profile?.email ?? "U").slice(0, 2).toUpperCase()
  const avatarSrc = profile?.profile_photo_url ?? undefined

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!email) {
      setError("missing_email_in_storage")
      return
    }

    try {
      setUploading(true)
      setError(null)
      await uploadProfilePhoto(email, file)
      await load()
    } catch (err: any) {
      setError(err?.message ?? "failed_to_upload")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const onSaveProfile = async () => {
    if (!email) {
      setError("missing_email_in_storage")
      return
    }
    try {
      setSaving(true)
      setError(null)
      await updateProfile(email, { full_name: fullName })
      await load()
    } catch (e: any) {
      setError(e?.message ?? "failed_to_save")
    } finally {
      setSaving(false)
    }
  }

  const onChangePassword = async () => {
    if (!email) {
      setError("missing_email_in_storage")
      return
    }
    try {
      setChangingPw(true)
      setError(null)
      await changePassword(email, {
        current_password: currentPw,
        new_password: newPw,
        confirm_new_password: confirmPw,
      })
      setCurrentPw("")
      setNewPw("")
      setConfirmPw("")
    } catch (e: any) {
      setError(e?.message ?? "failed_to_change_password")
    } finally {
      setChangingPw(false)
    }
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your personal information and account security.</p>
      </div>

      {error && (
        <div className="p-4 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">{String(error)}</div>
      )}

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : (
        <div className="grid gap-6">
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
                <div className="flex flex-col items-center space-y-3 sm:w-1/4">
                  <Avatar className="h-24 w-24 border-4 border-slate-50">
                    <AvatarImage src={avatarSrc} />
                    <AvatarFallback className="text-2xl font-bold bg-blue-100 text-blue-700">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <input
                    id="profile-photo-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={onPickFile}
                    disabled={uploading}
                  />

                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full text-xs h-8"
                    disabled={uploading}
                    onClick={() => console.log("pick-photo-click")}
                  >
                    <label htmlFor="profile-photo-input">
                      <Upload className="h-3.5 w-3.5 mr-2" />
                      {uploading ? "Uploading..." : "Change Photo"}
                    </label>
                  </Button>
                </div>

                <div className="flex-1 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-slate-700 font-semibold">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="fullName"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-9 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="roomUnit"
                        className="text-slate-700 font-semibold flex items-center justify-between"
                      >
                        Room / Unit
                        <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Locked
                        </span>
                      </Label>
                      <div className="relative">
                        <DoorClosed className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                          id="roomUnit"
                          value={profile?.room_id ?? ""}
                          disabled
                          className="pl-9 bg-slate-100 cursor-not-allowed text-slate-500 font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 font-semibold">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        value={profile?.email ?? ""}
                        readOnly
                        className="pl-9 bg-slate-100 cursor-not-allowed text-slate-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-slate-50/50 px-6 py-4 flex justify-end">
              <Button className="bg-blue-700 hover:bg-blue-800 text-white" onClick={onSaveProfile} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>

          <Card className="bg-white shadow-sm border-slate-200">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Security & Password
              </CardTitle>
              <CardDescription>
                Ensure your account is using a long, random password to stay secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-slate-700 font-semibold">
                  Current Password
                </Label>
                <div className="relative max-w-md">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="Enter your current password"
                    className="pl-9 bg-slate-50"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 my-2 pt-4"></div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-slate-700 font-semibold">
                    New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter a secure password"
                      className="pl-9 bg-slate-50"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-700 font-semibold">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter your new password"
                      className="pl-9 bg-slate-50"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-slate-50/50 px-6 py-4 flex justify-end">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={onChangePassword} disabled={changingPw}>
                {changingPw ? "Updating..." : "Update Password"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}