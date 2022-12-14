import React, { useEffect, useState, useRef } from "react";
import { useMoralis } from "react-moralis";
import {
  StyleSheet,
  View,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView
} from "react-native";
import EmojiSelector, { Categories } from 'react-native-emoji-selector';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faSmile } from '@fortawesome/free-solid-svg-icons';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import LottieView from 'lottie-react-native';
import Animation from '../../typingDotsLottie.json';

//RSA
var RSAKey = require('react-native-rsa');

const KEYBOARD_VERTICAL_OFFSET = 60 + StatusBar.currentHeight;

export default function Chat({navigation}) {
  const { Moralis, user } = useMoralis();
  const scrollViewRef = useRef();
  const currentUserId = user.id;
  const [date, viewDate] = useState(false);
  const [message, setMessage] = useState();
  const [messages, setMessages] = useState();
  const [updated, setUpdated] = useState();
  const [otherUserTyping, setOtherUserTyping] = useState();
  const [emojiVisible, setEmojiVisible] = useState(false);
  const newMessage = new Moralis.Object("Messages");
  const newUserTyping = new Moralis.Object("UserTyping");

  //RSA

  if(currentUserId === null){
    navigation.replace('Auth')
  }
  
  const bits = 256;
  const exponent = '10001'; // must be a string
  var rsa = new RSAKey();
  var r = rsa.generate(bits, exponent);
  var publicKey = {
      "n":"8c086868252404be004ce6b94d6691773cd77a707594fc0032ed1aee9d2ab437",
      "e":"10001"
  }; // return json encoded string
  var privateKey = {
      "n":"8c086868252404be004ce6b94d6691773cd77a707594fc0032ed1aee9d2ab437",
      "e":"10001",
      "d":"3ae78e83c09bd622d69d82b0900e8541af4df1015e48d2c45b3715158cb48c81",
      "p":"f058ed066379958dcedb9f790d5e3953",
      "q":"9527097bc213d01cae1a3edee30ea90d",
      "dmp1":"ab33fceacf12fd77fd00ae711117ac27",
      "dmq1":"7b3d5929a81004ea5db513f3c8bb0955",
      "coeff":"aa26a9c0ec411637b4f6fabc71873eb8"
  }; // return json encoded string

  const publicKeyJson = JSON.stringify(publicKey)
  const privateKeyJson = JSON.stringify(privateKey)
  // var rsa = new RSAKey();
  rsa.setPublicString(publicKeyJson);
  // var originText = 'sample String Value';
  // var encrypted = rsa.encrypt(originText);
  // console.log(encrypted)

  // console.log(publicKey)
  // console.log(privateKey)

  rsa.setPrivateString(privateKeyJson);
  // var decrypted = rsa.decrypt("25e2cf4b48b057dd1a73961f3e9cd8b401bc030bf25bdc13ec30522f4f49d9e5a6790de1");
  // console.log("This is: ", decrypted)

  const subscribeToMessages = async () => {
    let query = new Moralis.Query('Messages');
    let subscription = await query.subscribe();
    subscription.on('create', notifyOnCreate);
  }

  const notifyOnCreate = (result) => {
    setUpdated(result)
  }

  const subscribeToTyping = async () => {
    let query = new Moralis.Query('UserTyping');
    let subscription = await query.subscribe();
    subscription.on('create', notifyOnType);
    subscription.on('update', notifyOnType);
  }

  const notifyOnType = async (result) => {
    setOtherUserTyping(result)
  }

  const getAllMessages = async () => {
    const result = await Moralis.Cloud.run("getAllMessages");
    setMessages(result)
  }

  const isCurrentUser = (userId) => {
    return currentUserId === userId;
  }
  
  useEffect(() => {
    subscribeToMessages();
  }, []);

  useEffect(() => {
    subscribeToTyping(); 
  }, []);

  useEffect(() => {
    setMessage('');
  },[updated])

  useEffect(() => {
    getAllMessages();
  }, [updated]);

  const sendMessage = () => {
    newMessage.set('userId', currentUserId);
    newMessage.set('createdBy', user);
    // rsa.setPublicString(publicKey);
    const encrypt = rsa.encrypt(message)
    newMessage.set('message', encrypt);
    newMessage.save();
  }

  const onChangeText = (message) => {
    setMessage(message);
    Type(currentUserId);
  }

  const Type = async (userId) => {
    const params = { userId: userId };
    const result = await Moralis.Cloud.run("getTypingUser", params);

    if (result.length > 0) {
      result[0].set('isTyping', true);
      result[0].save();
    } else {
      newUserTyping.set('userId', userId);
      newUserTyping.set('isTyping', true);
      newUserTyping.save();
    }
  }

  const stopTyping = () => {
    if (otherUserTyping && otherUserTyping.attributes.isTyping) {
      otherUserTyping.set('isTyping', false);
      otherUserTyping.save();
    }
  }

  useEffect(() => {
    setTimeout(() => {
      stopTyping();
    }, 5000)
  }, [otherUserTyping]);

  const dateConverter = (date) => {
    return date?.toISOString("MM-DD-YYYY").split("T")[0];
  };

  const renderEmoji = () => {
    return (
      emojiVisible &&
      <EmojiSelector
        showSearchBar={false}
        category={Categories.symbols}
        showHistory={true}
        onEmojiSelected={emoji => setMessage(message + emoji)}
      />
    )
  }

  return (
    <SafeAreaView style={styles.flex}>
      <KeyboardAvoidingView
        enabled
        keyboardVerticalOffset={KEYBOARD_VERTICAL_OFFSET}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}>
        <View style={styles.scrollViewContainer}>
          <ScrollView style={styles.scrollView}
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}>
            {messages && messages.map((message) => 
              <View
                key={message[0] && message[0].data.id}
                style={[
                  styles.chatContainer,
                  isCurrentUser(message[0] && message[0].userId) && styles.right
                ]}>
                {!isCurrentUser(message[0] && message[0].userId) &&
                  <Image
                    source={require('../../Blockie.png')}
                    style={styles.profileImg}
                  />
                }
                <View>
                  <TouchableOpacity
                    onPress={() => viewDate(!date)}
                    style={[
                      styles.bubble,
                      isCurrentUser(message[0] && message[0].userId) && styles.isOwnedCornerRadius
                    ]}>
                    {!isCurrentUser(message[0] && message[0].userId) &&
                      <View style={{ flexDirection: 'row' }}>
                        <Text style={styles.username}>
                          {message[0] && message[0].userName}
                        </Text>
                        <Text
                          style={styles.ethAddress}
                          ellipsizeMode={"middle"}
                          numberOfLines={1}>
                          {` (${message[0] && message[0].ethAddress})`}
                        </Text>
                      </View>
                    }
                    <Text
                      style={[
                        styles.messageText,
                        isCurrentUser(message[0] && message[0].userId) && styles.isOwned
                      ]}>
                      {!date && message[0] && rsa.decrypt(message[0].data.attributes.message)}
                      {date && message[0].data.attributes.message}
                    </Text>
                  </TouchableOpacity>
                  {date &&
                    <Text style={[styles.date, isCurrentUser(message[0] && message[0].userId) && styles.right]}>
                      {dateConverter(message[0] && message[0].data.attributes.createdAt)}
                    </Text>
                  }
                </View>
              </View>
            )}
            {otherUserTyping && otherUserTyping.attributes.isTyping === true && otherUserTyping.attributes.userId !== currentUserId &&
              <View style={{flexDirection: 'row', marginBottom: 10}}>
                <Image
                  source={require('../../Blockie.png')}
                  style={[styles.profileImg, {marginTop: 20}]}
                />
                <LottieView source={Animation} loop autoPlay style={{width: 50, height: 70}}/>
              </View>
            }
          </ScrollView>
        </View>
        <View style={styles.textInputContainer}>
          <TextInput
            style={styles.textInput}
            onChangeText={onChangeText}
            placeholder="Aa"
            placeholderTextColor="#b5b5b5"
            multiline={true}
            value={message}
          />
          <TouchableOpacity
            onPress={() => setEmojiVisible(!emojiVisible)}
            style={styles.buttonContainer}>
            <FontAwesomeIcon
              icon={faSmile}
              size={25}
              style={styles.iconStyle} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => sendMessage()}
            disabled={message === '' ? true : false}
            style={[styles.buttonContainer]}>
            <FontAwesomeIcon
              icon={faPaperPlane}
              size={25}
              style={[styles.iconStyle, { color: message === '' ? 'gray' : '#7388ec' }]} />
          </TouchableOpacity>
        </View>
        {renderEmoji()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    opacity: 0.3,
    position: 'absolute',
    width: '100%',
    marginTop: 30
  },
  bubble: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    backgroundColor: '#fff',
    marginLeft: 10,
    marginTop: 5,
    shadowColor: '#171717',
    shadowOffset: {width: 1, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  date: {
    marginLeft: 15,
    marginTop: 5,
    fontSize: 10,
    color: 'gray'
  },
  isOwnedCornerRadius: {
    backgroundColor: '#7388ec',
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20
  },
  buttonContainer: {
    width: '15%',
    marginTop: 15
  },
  chatContainer: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 5
  },
  ethAddress: {
    color: '#74bcba',
    fontWeight: 'bold',
    fontSize: 11,
    marginLeft: 0,
    marginRight: 10,
    marginTop: 10,
    width: 100
  },
  flex: {
    flex: 1
  },
  iconStyle: {
    alignSelf: 'center',
    color: '#7388ec'
  },
  isOwned: {
    color: '#fff',
    paddingTop: 10
  },
  scrollView: {
    backgroundColor: 'transparent',
    flex: 1
  },
  scrollViewContainer: {
    backgroundColor: '#f7f6fc',
    flex: 1,
  },
  username: {
    color: '#74bcba',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 0,
    paddingBottom: 0,
    marginLeft: 13,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#fff',
    color: '#000',
    fontSize: 16,
    height: 50,
    paddingLeft: 20,
    marginTop: 10,
    width: '70%',
  },
  textInputContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
  },
  profileImg: {
    borderRadius: 30, 
    marginLeft: 10,
    marginTop: 18,
    height: 30,
    width: 30,
  },
  messageText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    paddingLeft: 13,
    paddingBottom: 13,
    paddingTop: 3,
    paddingRight: 13,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  right: {
    alignSelf: 'flex-end',
    marginRight: 10,
    marginTop: 10
  }
});
