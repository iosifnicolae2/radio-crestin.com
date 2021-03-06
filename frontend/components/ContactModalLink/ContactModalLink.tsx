import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton, useDisclosure, Button,
} from '@chakra-ui/react'
import { Link, Text } from '@chakra-ui/react'

export function ContactModalLink() {
  const { isOpen, onOpen, onClose } = useDisclosure()
  return (
    <>
      <Link onClick={onOpen}>
        Contact
      </Link>

      <Modal isOpen={isOpen} onClose={onClose} size={'lg'} preserveScrollBarGap={true}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Contact</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Dacă doriți să ne transmiteți un mesaj vă rugăm să folosiți una din modalitățile de mai jos.
            </Text>
            <Text mt={2.5}>
               Email:
              <Link href={"mailto:contact@radio-crestin.com"} color='teal.500' ml={1} isExternal>contact@radio-crestin.com</Link>
            </Text>
            <Text mt={0.9}>
              WhatsApp:
              <Link href={"https://wa.me/40773994595?text=Buna%20ziua"} color='teal.500' ml={1} isExternal>+4 0773 994 595</Link>
            </Text>
            <br/>
          </ModalBody>

          <ModalFooter>
            <Button onClick={onClose}>
              Închide
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
