import React, { useEffect, useContext, useState } from "react";
import assets from "../assets/assets";
import { ChatContext } from "../../context/chatContextCreate.js";
import { AuthContext } from "../../context/authContextCreate.js";

const RightSidebar = () => {
  const { selectedUser, messages } = useContext(ChatContext);
  const { logout, onlineUsers } = useContext(AuthContext);
  const [msgImages, setMsgImages] = useState([]);

  //get all the images from the messages and set them to state
  useEffect(() => {
    if (messages && messages.length > 0) {
      const images = messages
        .filter((msg) => msg.image)
        .map((msg) => msg.image);
      setMsgImages(images);
    }
  }, [messages]);

  return (
    selectedUser && (
      <div
        className={`bg-[#8185B2]/10 text-white w-full relative overflow-y-scroll ${
          selectedUser ? "max-md:hidden" : ""
        }`}
      >
        <div className="flex flex-col items-center mt-6">
          {/* Profile Image */}
          <img
            src={selectedUser?.profilePic || assets.avatar_icon}
            alt=""
            className="w-20 aspect-[1/1] rounded-full"
          />

          {/* Name with online status */}
          <h1 className="text-xl font-medium flex items-center justify-center gap-2 mt-3">
            {onlineUsers.includes(selectedUser._id) && (
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
            )}
            {selectedUser.fullName}
          </h1>

          {/* Bio */}
          <p className="text-center mt-2">{selectedUser.bio}</p>
        </div>

        <hr className="border-[#ffffff50] my-4" />

        <div className="px-5 text-xs">
          <p>Media</p>
          <div className="mt-2 max-h-[200px] overflow-y-scroll grid grid-cols-2 gap-4 opacity-80">
            {msgImages.map((url, index) => (
              <div
                key={index}
                onClick={() => window.open(url)}
                className="cursor-pointer rounded"
              >
                <img src={url} alt="" className="h-full rounded-md" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <button
            onClick={() => logout()}
            className="absolute bottom-5 left-1/2 transform -translate-x-1/2 
                        bg-gradient-to-r from-purple-400 to-violet-600 
                        text-white border-none text-sm font-light 
                        py-2 px-20 rounded-full cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>
    )
  );
};

export default RightSidebar;
