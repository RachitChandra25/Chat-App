import { useState, useContext, useEffect, useCallback } from "react";
import { AuthContext } from "./authContextCreate.js";
import { ChatContext } from "./chatContextCreate.js";
import { toast } from "react-hot-toast";

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unseenMessages, setUnseenMessages] = useState({});

  const { socket, axios, authUser } = useContext(AuthContext);

  // =========================
  // GET USERS (with unseen messages)
  // =========================
  const getUsers = useCallback(async () => {
    try {
      // /api/messages/users returns users + unseenMessages count
      const { data } = await axios.get("/api/messages/users");

      if (data.success) {
        setUsers(data.users);
        setUnseenMessages(data.unseenMessages || {});
      }
    } catch (error) {
      console.error("Get Users Error:", error);
    }
  }, [axios]);

  // =========================
  // GET MESSAGES
  // =========================
  const getMessages = useCallback(
    async (userId) => {
      try {
        const { data } = await axios.get(`/api/messages/${userId}`);

        if (data.success) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error("Get Messages Error:", error);

        toast.error(
          error.response?.data?.message || "Failed to fetch messages",
        );
      }
    },
    [axios],
  );

  // =========================
  // SEND MESSAGE
  // =========================
  const sendMessage = async (messageData) => {
    try {
      const { data } = await axios.post(
        `/api/messages/send/${selectedUser._id}`,
        messageData,
      );

      if (data.success) {
        setMessages((prev) => [...prev, data.newMessage]);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error("Send Message Error:", error);

      toast.error(
        error.response?.data?.message || "Failed to send message",
      );
    }
  };

  // =========================
  // SOCKET SUBSCRIBE
  // =========================
  const subscribeToMessages = useCallback(() => {
    if (!socket) return;

    socket.off("newMessage");

    socket.on("newMessage", (newMessage) => {
      if (
        selectedUser &&
        ((newMessage.senderId === selectedUser._id &&
          newMessage.receiverId === authUser?._id) ||
          (newMessage.senderId === authUser?._id &&
            newMessage.receiverId === selectedUser._id))
      ) {
        setMessages((prev) => [...prev, newMessage]);
      } else if (newMessage.senderId !== authUser?._id) {
        setUnseenMessages((prev) => ({
          ...prev,
          [newMessage.senderId]: prev[newMessage.senderId]
            ? prev[newMessage.senderId] + 1
            : 1,
        }));
      }
    });
  }, [socket, selectedUser, authUser]);

  const unsubscribeFromMessages = useCallback(() => {
    if (socket) {
      socket.off("newMessage");
    }
  }, [socket]);

  useEffect(() => {
    subscribeToMessages();

    return () => unsubscribeFromMessages();
  }, [subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (authUser) {
      getUsers();
    }
  }, [authUser, getUsers]);

  const value = {
    messages,
    users,
    selectedUser,
    getUsers,
    getMessages,
    setMessages,
    sendMessage,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};