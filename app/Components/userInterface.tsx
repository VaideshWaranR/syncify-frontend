'use client'
import { AppWindowIcon, CodeIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ReactEventHandler, useEffect, useState } from "react"
import { useSocket } from "../Context/SocketContext"

interface UserInterfaceProps {
    users:string[];
    setUsers:React.Dispatch<React.SetStateAction<string[]>>;
}

export default function UserInterface() {
  const [userName,setUserName]=useState("");
  const [roomName,setRoomName]=useState("");
  const [users,setUsers]=useState<string[]>([]);

  const handleCreateRoom=()=>{
   socket.emit("create_room",{userName,roomName})
   alert("Room Created Successfully")
  }
  const handleJoinRoom=()=>{
   socket.emit("join_room",{userName,roomName})
   alert("Room Joined Successfully")
  }

  const socket=useSocket();
  useEffect(()=>{
  socket.on("user_update",(data)=>{
    console.log(data)
  setUsers([...data])
  })
  },[socket])

  return (
    <div className="flex flex-col w-full h-full justify-center items-center gap-10">
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Tabs defaultValue="create">
        <TabsList>
          <TabsTrigger value="create">Create Room</TabsTrigger>
          <TabsTrigger value="join">Join Room</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create a new User</CardTitle>
              <CardDescription>
                Make changes to your account here. Click save when you&apos;re
                done.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="tabs-demo-name">Username</Label>
                <Input id="tabs-demo-name" onChange={(e)=>setUserName(e.target.value)} />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="tabs-demo-username">Roomname</Label>
                <Input id="tabs-demo-username"  onChange={(e)=>setRoomName(e.target.value)}/>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCreateRoom}>Create Room</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="join">
          <Card>
            <CardHeader>
              <CardTitle>UserName</CardTitle>
              <CardDescription>
                Join rooms hassel free
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-3">
                <Label htmlFor="tabs-demo-current">UserName</Label>
                <Input id="tabs-demo-current" type="text" onChange={(e)=>setUserName(e.target.value)} />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="tabs-demo-new">Room Name</Label>
                <Input id="tabs-demo-new" type="text" onChange={(e)=>setRoomName(e.target.value)} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleJoinRoom}>Join</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    <ul>
      {users.map((user,ind)=>{
        return (
        <li key={ind} className="text-white text-xl">{user}</li>)
      })}
    </ul>
    </div>
  )
}
