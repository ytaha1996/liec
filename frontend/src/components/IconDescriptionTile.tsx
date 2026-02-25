import React from 'react';
import { NavLink } from 'react-router-dom';
import Logo from './Logo';
import { makeStyles } from 'tss-react/mui';

interface IIconTileProps {
  title: string;
  description: string;
  imgSrc: string;
  className?: string;
  route?: string;
  onClick: () => void;
}

const useStyles = makeStyles()((theme) => ({
  tileContainer: {
    display: 'flex',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    cursor: 'pointer',
    height: 100,
    transition: theme.transitions.create('border-color', { duration: theme.transitions.duration.shortest }),
    '&:hover': {
      borderColor: theme.palette.primary.main,
      boxShadow: theme.shadows[2],
    },
  },
  tileText: {
    borderLeft: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(0.5, 0.75),
    overflow: 'hidden',
    background: theme.palette.background.default,
    width: '100%',
    boxSizing: 'border-box',
  },
  tileTitle: {
    margin: 0,
    lineHeight: 'normal',
    fontFamily: '"Poppins", sans-serif',
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  tileDescription: {
    marginTop: theme.spacing(0.5),
    fontFamily: '"Inter", sans-serif',
    fontSize: theme.typography.body2.fontSize as any,
    color: theme.palette.text.secondary,
  },
  appLink: {
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    width: '100%',
  },
}));


const IconDescriptionTile: React.FC<IIconTileProps> = ({
  title,
  description,
  imgSrc,
  className,
  route,
  onClick,
}) => {
  const { classes, cx } = useStyles();

  function renderTile() {
    return (
      <>
        <Logo
          verticalPadding={20}
          horizontalPadding={20}
          src={imgSrc}
          alt={title}
          height={100}
          width={100}
        />
        <div className={classes.tileText}>
          <h4 className={classes.tileTitle}>{title}</h4>
          <p className={classes.tileDescription}>{description}</p>
        </div>
      </>
    );
  }

  function containerClasses(): string {
    return classes.tileContainer + (className ? ` ${className}` : '');
  }

  return route ? (
    <NavLink
      to={route}
      className={cx(classes.appLink, containerClasses())}
      onClick={onClick}
    >
      {renderTile()}
    </NavLink>
  ) : (
    <button className={containerClasses()} onClick={onClick} type="button">
      {renderTile()}
    </button>
  );
};

export default IconDescriptionTile;
