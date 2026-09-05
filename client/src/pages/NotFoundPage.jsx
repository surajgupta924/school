import { Link } from 'react-router-dom';
import { Card, EmptyState } from '../components/ui';
import { IconSearch } from '../components/Icons';

export default function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        icon={<IconSearch size={22} />}
        title="Page not found"
        text="The page you are looking for does not exist or is not available for your role."
        action={
          <Link className="btn" to="/">
            Back to dashboard
          </Link>
        }
      />
    </Card>
  );
}
