import { ref } from 'vue'
import { ApiError } from '@/lib/api'

/**
 * Submission state of a form backed by the API: loading flag, global error message
 * and per-field validation errors (from Problem Details "errors").
 */
export function useForm() {
  const processing = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<Record<string, string[]>>({})

  async function submit<T>(action: () => Promise<T>): Promise<T | undefined> {
    processing.value = true
    error.value = null
    fieldErrors.value = {}
    try {
      return await action()
    } catch (e) {
      if (e instanceof ApiError) {
        fieldErrors.value = e.errors
        // Validation errors are displayed under each field; other errors at the top of the form.
        if (e.type !== 'validation-error') error.value = e.detail ?? e.message
      } else {
        error.value = 'Une erreur inattendue est survenue.'
      }
      return undefined
    } finally {
      processing.value = false
    }
  }

  const fieldError = (field: string) => fieldErrors.value[field]?.[0]

  return { processing, error, fieldErrors, fieldError, submit }
}
