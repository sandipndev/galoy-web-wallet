import { gql } from "@apollo/client"

const MUTATION_USER_LOGIN = gql`
  mutation userLogin($input: UserLoginInput!) {
    userLogin(input: $input) {
      errors {
        message
      }
      authToken
    }
  }
`

export default MUTATION_USER_LOGIN
