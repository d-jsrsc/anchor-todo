use anchor_lang::{prelude::*, AccountsClose};
use anchor_spl::token::{self, Mint, SetAuthority, Token, TokenAccount};
use spl_token::instruction::AuthorityType;

use crate::state::{TreeNode, CHILDREN_LEN};

const NODE_PDA_SEED: &[u8] = b"node_pda_seed";

pub fn new_tree_handler(ctx: Context<TreeRootAccounts>, account_bump: u8) -> Result<()> {
    let root_pda = &mut ctx.accounts.node;
    // root_pda.owner = *(ctx.accounts.user.to_account_info().key);
    root_pda.bump = account_bump;
    root_pda.parent_mint = *(ctx.accounts.mint.to_account_info().key);
    root_pda.children_mint = [None; CHILDREN_LEN];
    Ok(())
}

pub fn add_tree_node(
    ctx: Context<AddTreeNodeAccounts>,
    account_bump: u8,
    index: u32,
) -> Result<()> {
    // let node_key = *ctx.accounts.node.to_account_info().key;
    let parent_key = *ctx.accounts.parent.to_account_info().key;
    let parent_pda = &mut ctx.accounts.parent;

    let node_pda = &mut ctx.accounts.node;

    parent_pda.children_mint[index as usize] = Some(ctx.accounts.mint.to_account_info().key());
    node_pda.bump = account_bump;
    node_pda.children_mint = [None; 3];

    // node tokenAccount owner change
    token::set_authority(
        ctx.accounts.into_set_authority_context(), // use extended priviledge from current instruction for CPI
        AuthorityType::AccountOwner,
        Some(parent_key),
    )?;

    Ok(())
}

pub fn extract_tree_node(ctx: Context<ExtractTreeNodeAccounts>) -> Result<()> {
    let mint_key = ctx.accounts.mint.to_account_info().key();
    let user = ctx.accounts.user.to_account_info().key();

    let parent_pda = &mut ctx.accounts.parent;

    let mint_position = parent_pda
        .children_mint
        .iter()
        .position(|&s| s == Some(mint_key));

    if let Some(mint_position) = mint_position {
        parent_pda.children_mint[mint_position] = None;
    }

    let node_pda = &mut ctx.accounts.node;
    let node_children = node_pda.children_mint.iter().any(|&val| val != None);
    if !node_children {
        node_pda.close(ctx.accounts.user.to_account_info())?
    }

    let parent_bump = parent_pda.bump;
    let parent_mint = parent_pda.parent_mint;

    let seeds = &[
        b"node_pda_seed",
        user.as_ref(),
        parent_mint.as_ref(),
        &[parent_bump],
    ];

    // node tokenAccount owner change
    token::set_authority(
        ctx.accounts
            .into_set_authority_context()
            .with_signer(&[&seeds[..]]), // use extended priviledge from current instruction for CPI
        AuthorityType::AccountOwner,
        Some(user),
    )?;

    Ok(())
}

#[derive(Accounts)]
pub struct TreeRootAccounts<'info> {
    #[account(
        init,
        payer = user,
        space = TreeNode::space(),
        seeds = [
            NODE_PDA_SEED,
            user.to_account_info().key.as_ref(),
            mint.key().as_ref()
        ],
        bump
    )]
    pub node: Account<'info, TreeNode>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = mint_token_account.amount == 1,
        constraint = mint_token_account.mint == mint.key(),
        constraint = mint_token_account.owner == user.key(),
    )]
    pub mint_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    // pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AddTreeNodeAccounts<'info> {
    #[account(
        init,
        payer = user,
        space = TreeNode::space(),
        seeds = [
            NODE_PDA_SEED,
            user.to_account_info().key.as_ref(),
            mint.key().as_ref()
        ],
        bump
    )]
    pub node: Account<'info, TreeNode>,
    #[account(
        mut,
        seeds = [
            NODE_PDA_SEED,
            user.to_account_info().key.as_ref(),
            parent.parent_mint.key().as_ref()
        ],
        bump = parent.bump
    )]
    pub parent: Account<'info, TreeNode>,
    pub mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = mint_token_account.amount == 1,
        constraint = mint_token_account.mint == mint.key(),
        constraint = mint_token_account.owner == user.key(),
    )]
    pub mint_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
}

impl<'info> AddTreeNodeAccounts<'info> {
    fn into_set_authority_context(&self) -> CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> {
        let cpi_accounts = SetAuthority {
            account_or_mint: self.mint_token_account.to_account_info(),
            current_authority: self.user.to_account_info(),
        };

        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}

#[derive(Accounts)]
pub struct ExtractTreeNodeAccounts<'info> {
    #[account(
        mut,
        seeds = [
            NODE_PDA_SEED,
            user.to_account_info().key.as_ref(),
            mint.key().as_ref()
        ],
        bump
    )]
    pub node: Account<'info, TreeNode>, // if childLen == 0 close
    #[account(
        mut,
        seeds = [
            NODE_PDA_SEED,
            user.to_account_info().key.as_ref(),
            parent.parent_mint.key().as_ref()
        ],
        bump = parent.bump
    )]
    pub parent: Account<'info, TreeNode>, // index == null
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub mint_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    pub token_program: Program<'info, Token>,
}

impl<'info> ExtractTreeNodeAccounts<'info> {
    fn into_set_authority_context(&self) -> CpiContext<'_, '_, '_, 'info, SetAuthority<'info>> {
        let cpi_accounts = SetAuthority {
            account_or_mint: self.mint_token_account.to_account_info(),
            current_authority: self.parent.to_account_info(),
        };

        CpiContext::new(self.token_program.to_account_info(), cpi_accounts)
    }
}
