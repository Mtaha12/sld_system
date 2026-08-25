import { Link } from 'react-router-dom'

const AuthSupportLink = ({ action, text }) => {
  return (
    <div className="text-center mt-1 text-sm text-theme-disabled">
      {text ? text : `Getting issues ${action}?`}{' '}
      <Link
        to="/contact"
        className="text-brand-orange hover:text-brand-orange-hover underline decoration-brand-orange/50 underline-offset-4"
      >
        Contact us
      </Link>
    </div>
  )
}

export default AuthSupportLink
