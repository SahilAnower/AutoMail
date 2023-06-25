import axios from 'axios';
import dotenv from 'dotenv';
import { createMimeMessage } from 'mimetext';

dotenv.config();
// initializing my environment variables here.

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const refreshToken = process.env.REFRESH_TOKEN;

const getAccessToken = async () => {
  try {
    const response = await axios.post(
      'https://accounts.google.com/o/oauth2/token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    // returning the access_token generated through refresh_token.
    return response.data.access_token;
  } catch (error) {
    console.error(error);
  }
};

const getUnreadMessages = async () => {
  try {
    const accessToken = await getAccessToken();
    const { data } = await axios.get(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const allMessages = data.messages;
    // get all messages from user's gmail
    const msgMap = new Map();
    allMessages.forEach((message) => {
      if (msgMap.has(message.threadId)) msgMap.set(message.threadId, '-1');
      else msgMap.set(message.threadId, message.id);
    });

    const unRespondedMessages = [];

    // getting all messages which are still not replied yet from user.
    // using the logic that a single thread message will always be our candidate gmail to reply back.
    // also, we are checking it afterwards whether the -
    // 👉🏻 It's a self message.
    // 👉🏻 It's a sent message, not from other user.
    for (const [key, value] of msgMap) {
      if (value === '-1') continue;
      unRespondedMessages.push({
        id: value,
        threadId: key,
      });
    }

    const filteredLabels = await checkLabelExists('test', accessToken);
    let labelId;
    if (filteredLabels.length === 0) {
      labelId = await createNewLabel(accessToken, 'test');
    } else {
      labelId = filteredLabels[0].id;
    }
    // creating label of test under each message that we will send
    // through node.

    const requests = unRespondedMessages.map((message) =>
      getMessageDetails(accessToken, message.id, message.threadId, labelId)
    );
    // fetching all the requests

    const responses = await Promise.all(requests);
    // getting the responses back by concurrntly running all the calls using Promise all.
  } catch (error) {
    console.error(error.response.data);
  }
};

const getMessageDetails = async (accessToken, messageId, threadId, labelId) => {
  try {
    const { data } = await axios.get(
      `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    // getting all headers and details about a particular message.

    const isSent = data.labelIds.includes('SENT');
    if (isSent) return;
    // if label is SENT, then it is not our candidate.

    const headers = data.payload.headers;

    const emailSubject = headers.filter(
      (eachHeader) => eachHeader.name === 'Subject'
    )[0].value;
    // getting the subject of the email sent by opposite user.
    const sender = headers.filter(
      (eachHeader) => eachHeader.name === 'From'
    )[0];
    // getting the sender address
    const reciever = headers.filter(
      (eachHeader) => eachHeader.name === 'To'
    )[0];
    // getting reciever address
    if (sender === undefined || reciever === undefined) return;
    if (sender === reciever) return;
    // if it is a self message, return.
    // 🌟 IMP, otherwise the message will go on forever recursion.

    // sending reply to the inbox mail recieved.
    const sendingEmail = createMimeMessage();
    sendingEmail.setSender(reciever.value);
    sendingEmail.setTo(sender.value);
    sendingEmail.setSubject(`Re: ${emailSubject}`);
    sendingEmail.addMessage({
      contentType: 'text/plain',
      data: `Hi,
    I'm a simple text.`,
    });

    const response = await axios.post(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        id: messageId,
        threadId: threadId,
        raw: sendingEmail.asEncoded(),
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    // sending the reply, and then getting it's id,
    // for marking it under "test" label
    const createdMessageId = response.data.id;

    await addLabelToMessage(createdMessageId, accessToken, labelId);
  } catch (error) {
    console.error(error.response.data);
  }
};

const checkLabelExists = async (labelName, accessToken) => {
  try {
    const labels = await getAllLabels(accessToken);
    // getting all the labels list
    const filteredLabels = labels.filter(
      (eachLabel) => eachLabel.name === labelName
    );
    // then checking this label exists, or we need
    // to create it first.
    return filteredLabels;
  } catch (error) {
    console.error(error.response.data);
  }
};

const createNewLabel = async (accessToken, labelName) => {
  try {
    const { data } = await axios.post(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      {
        name: labelName,
        messageListVisibility: 'show',
        labelListVisibility: 'labelShow',
        type: 'user',
        messagesTotal: 0,
        messagesUnread: 0,
        threadsTotal: 0,
        threadsUnread: 0,
        color: {
          textColor: '#fbe983',
          backgroundColor: '#83334c',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    // creating new label with requested parameters,
    // and sending back the id of the created label.
    return data.id;
  } catch (error) {
    console.error(error.response.data);
  }
};

const addLabelToMessage = async (createdMessageId, accessToken, labelId) => {
  try {
    // add label of "test" to the send messages.
    const { data } = await axios.post(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${createdMessageId}/modify`,
      {
        addLabelIds: [labelId],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } catch (error) {
    console.error(error.response.data);
  }
};

const getAllLabels = async (accessToken) => {
  try {
    const { data } = await axios.get(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const labels = data.labels;
    return labels;
  } catch (error) {
    console.error(error.response.data);
  }
};

const automateEmailing = (minSeconds, maxSeconds) => {
  // main entry point of the application, it will keep checking for any new
  // unreplied messages and send reply to each of them under label "test".
  setInterval(async () => {
    await getUnreadMessages();
  }, Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds));
};

automateEmailing(4500, 12000);
// checking of emails in a gap of 45 to 120s.
