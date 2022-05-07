import React, {RefObject, useState} from "react";

import FacebookIcon from "@/public/facebook.svg";
import {
  Text,
  Link,
  Flex,
  Image,
  useToast,
  useDisclosure, FormControl, FormLabel, Input, Button, Textarea
} from "@chakra-ui/react";
import { ExternalLinkIcon } from '@chakra-ui/icons'
// @ts-ignore
import ReactStars from "react-rating-stars-component";
import {postReviewClientSide} from "../../frontendServices/review";

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react'
import {FocusableElement} from "@chakra-ui/utils";

export default function StationInformation(props: any) {
  const { station } = props;
  const average = (arr: any[]) => arr.reduce((a,b) => a + b, 0) / arr.length;
  const StationRating = average(station.reviews.map((i: any)=>i.stars)) || 0;
  const NumberOfListeners = station.now_playing?.listeners || null;
  const latestPost = station.posts[0];
  const toast = useToast();

  const [userReviewStars, setUserReviewStars] = useState(5)
  const [userReviewMessage, setUserReviewMessage] = useState("")
  const { isOpen, onOpen, onClose } = useDisclosure()

  const initialRef = React.useRef<HTMLTextAreaElement>(null);

  const submitReviewMessage = async () => {
    onClose();
    const {done} = await postReviewClientSide({
      user_name: null,
      station_id: station.id,
      stars:  userReviewStars,
      message: userReviewMessage
    });
    if(done) {
      toast({
        title: 'Review-ul a fost încărcat cu success.',
        description: "Vă mulțumim frumos!",
        status: 'success',
        position: 'bottom-left',
        duration: 3000,
        isClosable: true,
      })
    } else {
      toast({
        title: 'A apărut o eroare neașteptată.',
        description: "Vă rugăm să încercați mai târziu!",
        status: 'error',
        position: 'bottom-left',
        duration: 9000,
        isClosable: true,
      })
    }
  }
  const onRatingChange = async (stars: number) => {
    const {done} = await postReviewClientSide({
      user_name: null,
      station_id: station.id,
      stars:  userReviewStars,
      message: null
    });
    if(done) {
      setUserReviewStars(stars);
      setUserReviewMessage("");
      onOpen();
    } else {
      toast({
        title: 'A apărut o eroare neașteptată.',
        description: "Vă rugăm să încercați mai târziu!",
        status: 'error',
        position: 'bottom-left',
        duration: 9000,
        isClosable: true,
      })
    }
  };

  return (
    <Flex direction={'column'} pl={{base: 0, lg: 4}}>
      <Text as='h1' fontSize='5xl' noOfLines={1} fontWeight='bold'>
        {station.title}
      </Text>

      <Flex>
        <ReactStars
          count={5}
          onChange={(rating: any) => onRatingChange(rating)}
          size={20}
          value={StationRating}
          activeColor="#fe7f38"
        />
        {/* @ts-ignore */}
        {StationRating !== 0 && (
          <Text fontSize={'md'} lineHeight={'30px'} ml={1}>{StationRating}/5</Text>
        )}
        {station.facebook_page_id && <Link href={'https://facebook.com/' + station.facebook_page_id} isExternal>
          <Image
            src={FacebookIcon.src}
            alt={"facebook icon"}
            height={22}
            width={22}
            m={'4px'}
            ml={1.5}
          />
        </Link>}

      </Flex>

      {NumberOfListeners && <Text
        fontSize='md'>
        {NumberOfListeners} persoane ascultă împreună cu tine acest radio
      </Text>}

      {latestPost ? (
        <>
          <Text as='h2' fontSize='xl' mt='6' maxW={'80%'} noOfLines={1} fontWeight='bold'>
            {latestPost.title}
          </Text>
          <Text fontSize='xl' mt='1' noOfLines={3} maxW={'90%'}>
            {latestPost.description}
          </Text>
          <Link href={latestPost.link} mt='3' isExternal>
            Continuă citirea articolului <ExternalLinkIcon mx='2px' />
          </Link>
        </>
      ): (
        <>
          <Text as='h2' fontSize='xl' mt='6' maxW={'80%'} noOfLines={1} fontWeight='bold'>
            {station.title}
          </Text>
          <Text fontSize='xl' mt='1' noOfLines={3} maxW={'90%'}>
            {station.description}
          </Text>
          {station.website && <Link href={station.website} mt='3' w={'fit-content'}isExternal>
            Vizitează site-ul web <ExternalLinkIcon mx='2px' />
          </Link>}
        </>
      )}

      <Modal
        initialFocusRef={initialRef}
        isOpen={isOpen}
        onClose={onClose}
        preserveScrollBarGap={true}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Adauga un mesaj recenziei</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <FormControl>
              <FormLabel>Mesajul dumneavoastra</FormLabel>
              <Textarea
                ref={initialRef}
                placeholder='Introduceți mesajul dumneavoastră aici..'
                onChange={(e) => {
                  setUserReviewMessage(e.target.value);
                }}
                size='sm'
                resize={'none'}
              />
            </FormControl>

          </ModalBody>

          <ModalFooter>
            <Button colorScheme='blue' mr={3} onClick={submitReviewMessage}>
              Trimite
            </Button>
            <Button onClick={submitReviewMessage}>Închide</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
}
