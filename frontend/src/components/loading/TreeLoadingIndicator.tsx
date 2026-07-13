import './LoadingIndicator.css';
import type { TreeLoadStatus } from '../../features/existing-trees/ExistingTreesEntities';

type Props = {
	status: TreeLoadStatus;
	left?: number | string;
};

export function TreeLoadingIndicator({ status, left = '4rem' }: Props) {
	const { loading, count, limit, tooFarOut } = status;

	// Progress 0–100. Capped at 99 while still loading so the bar never
	// appears "done" prematurely. Empty bar when too far out.
	const raw = limit > 0 ? (count / limit) * 100 : 0;
	const progress = tooFarOut ? 0 : loading ? Math.min(raw, 99) : Math.min(raw, 100);

	const title = tooFarOut
		? 'Existing Trees (BGT)'
		: loading
			? 'Loading trees...'
			: 'Trees loaded';

	const subtitle = tooFarOut
		? `Zoom in below ${(20000).toLocaleString()} m altitude to load trees`
		: loading
			? `${count.toLocaleString()} trees loaded so far...`
			: status.hitLimit
				? `${count.toLocaleString()} trees loaded — zoom in to see more`
				: `${count.toLocaleString()} trees loaded`;

	return (
		<div
			style={{
				position: 'absolute',
				top: 20,
				left: left,
				background: 'white',
				color: 'black',
				padding: '14px 20px',
				borderRadius: '12px',
				boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
				border: '1px solid rgba(0,0,0,0.15)',
				pointerEvents: 'auto',
				width: '300px',
				display: 'flex',
				flexDirection: 'column',
				gap: '8px',
				zIndex: 1000,
			}}
		>
			<span style={{ fontSize: '15px', fontWeight: 700 }}>{title}</span>

			<div className="progress-track">
				<div
					className="progress-fill"
					style={{
						width: `${progress}%`,
						background: 'linear-gradient(90deg, #1a6e3c, #2d8a4e)',
					}}
				/>
			</div>

			<span style={{ fontSize: '12px', color: '#555' }}>{subtitle}</span>
		</div>
	);
}
