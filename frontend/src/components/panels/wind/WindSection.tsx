import { CollapsibleSection } from '../../CollapsibleSection';
import { LockToggle } from '../../form';

interface WindSectionProps {
	title: string;
	isLocked: boolean;
	onToggleLock: () => void;
	children: React.ReactNode;
	separator?: boolean;
	defaultOpen?: boolean;
}

export function WindSection({
	title,
	isLocked,
	onToggleLock,
	children,
	separator,
	defaultOpen,
}: WindSectionProps) {
	return (
		<CollapsibleSection title={title} separator={separator} defaultOpen={defaultOpen}>
			<LockToggle isLocked={isLocked} onToggle={onToggleLock} />
			{children}
		</CollapsibleSection>
	);
}
