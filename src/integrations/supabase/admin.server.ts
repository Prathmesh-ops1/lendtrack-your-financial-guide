import '@tanstack/react-start/server-only'
import { supabaseAdmin } from './client.server'

export type CreateVerifiedUserArgs = {
  email: string
  password: string
  firstName: string
  lastName?: string | null
  mobile?: string | null
}

export async function createVerifiedUser({
  email,
  password,
  firstName,
  lastName,
  mobile,
}: CreateVerifiedUserArgs) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName ?? undefined,
      mobile: mobile ?? undefined,
    },
  })

  if (error) {
    throw new Error(error.message)
  }

  if (!data?.user) {
    throw new Error('Unable to create user.')
  }

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    user_id: data.user.id,
    first_name: firstName,
    last_name: lastName || null,
    mobile: mobile || null,
  })

  if (profileError && !profileError.message.includes('duplicate')) {
    throw new Error(profileError.message)
  }

  return { userId: data.user.id }
}
